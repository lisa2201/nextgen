<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use Cache;
use CacheHelper;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Room;
use Kinderm8\RoomCapacity;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\User;
use Kinderm8\Http\Resources\RoomResource;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Exceptions\System\ServerErrorException;
use LocalizationHelper;
use RequestHelper;

class RoomController extends Controller
{
    private $roomRepo;
    private $snsService;
    private $userRepo;

    public function __construct(IRoomRepository $roomRepo, SNSContract $snsService, IUserRepository $userRepo)
    {
        $this->roomRepo = $roomRepo;
        $this->snsService = $snsService;
        $this->userRepo = $userRepo;
    }

    public function getStaffList(Request $request)
    {
        $user = $this->userRepo->findAdministrativeUsers($request, false, false);

        return (new UserResourceCollection($user, ['basic' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function get(Request $request)
    {
        $data = $this->roomRepo->list($request);

        return (new RoomResourceCollection($data['list']))
             ->additional([
                'totalRecords' => $data['list'],
                'displayRecord' =>$data['list'],
                'filtered' => $data['list']
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getAll(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->roomRepo->get(
                [],
                [ 'staff', 'roomCapacity', 'roomCapacity.user' ],
                $request,
                false
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

        return (new RoomResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function store(request $request)
    {
        DB::beginTransaction();

        try
        {
            $room = $this->roomRepo->store($request, 'RoomCapacity');

            // create room capacity record only if capacity is not null
            if($request->input('capacity'))
            {
                $newRoomCapacity = new RoomCapacity();
                $newRoomCapacity->room_id = $room->id;
                $newRoomCapacity->capacity = $request->input('capacity');
                $newRoomCapacity->effective_date = $request->input('effectiveDate');
                $newRoomCapacity->created_by = auth()->user()->id;
                $newRoomCapacity->save();
            }

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_room', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $room->id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::ROOM_SUBJECT
                );
            }
            DB::commit();

            return response()->json(RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_create'),
                new RoomResource($room)
            ), RequestType::CODE_201);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function updateStatus(Request $request)
    {
         DB::beginTransaction();

        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));
            $room = $this->roomRepo->updateStatus($request, $id);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_room', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::ROOM_SUBJECT
                );
            }


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new RoomResource($room)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function addCapacity(Request $request)
    {
        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));

            $room = Room::find($id);

            /* update room capacity record */
            $newRoomCapacity = new RoomCapacity();
            $newRoomCapacity->room_id = $room->id;
            $newRoomCapacity->capacity = $request->input('capacity');
            $newRoomCapacity->effective_date = $request->input('effectiveDate');
            $newRoomCapacity->created_by = auth()->user()->id;
            $newRoomCapacity->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new RoomResource($room)
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }

    }

    public function edit(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('index'));
            $room = $this->roomRepo->findById($id, [ 'roomCapacity', 'roomCapacity.user', 'staff']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new RoomResource($room)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $room = $this->roomRepo->update($request);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_room', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $room->id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::ROOM_SUBJECT
                );
            }

            /* update room capacity record only if capacity is not null */
            if($request->input('capacity'))
            {
                $newRoomCapacity = new RoomCapacity();
                $newRoomCapacity->room_id = $room->id;
                $newRoomCapacity->capacity = $request->input('capacity');
                $newRoomCapacity->effective_date = $request->input('effectiveDate');
                $newRoomCapacity->created_by = auth()->user()->id;
                $newRoomCapacity->save();
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new RoomResource($room)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $room = $this->roomRepo->delete(Helpers::decodeHashedID($request->input('id')));
            $roomID = Helpers::decodeHashedID($request->input('id'));
            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_room', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $roomID,
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ROOM_SUBJECT
                );
                // \Log::info("branch connected to current gen. room delete sns sent. room id => ".$roomID);
            }

            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete'),
                    ['totalRecords' => $room]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
