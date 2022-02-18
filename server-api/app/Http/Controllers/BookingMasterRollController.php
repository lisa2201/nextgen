<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kinderm8\Http\Requests\MasterRollBookingsPreviewRequest;
use Kinderm8\Http\Requests\MasterRollBookingStoreRequest;
use Kinderm8\Http\Requests\MasterRollBookingUpdateRequest;
use Kinderm8\Http\Requests\MasterRollManageBookingsPreviewRequest;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use RequestHelper;

class BookingMasterRollController extends Controller
{
    use UserAccessibility;

    private $bookingRepo;
    private $childRepo;
    private $roomRepo;
    private $feeRepo;
    private $snsService;

    public function __construct(IBookingRepository $bookingRepo, IChildRepository $childRepo, IRoomRepository $roomRepo, IFeeRepository $feeRepo, SNSContract $SNSService)
    {
        $this->bookingRepo = $bookingRepo;
        $this->childRepo = $childRepo;
        $this->roomRepo = $roomRepo;
        $this->feeRepo = $feeRepo;
        $this->snsService = $SNSService;
    }

    /**
     * get master roll bookings
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        try
        {
            $bookings = $this->bookingRepo->masterRollList([], $request);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $bookings = [];
        }

        return (new BookingResourceCollection($bookings, [ 'withAttendance' => true, 'withChild' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
            $get_abs_reason = (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : null;
            $ref_id = (! Helpers::IsNullOrEmpty($request->input('ref'))) ? Helpers::decodeHashedID($request->input('ref')) : null;

            //get children
            $children = $this->childRepo->get([
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ], [ 'rooms' ], $request, false);

            //get rooms
            $rooms = $this->roomRepo->get(
                [
                    'status' => '0',
                    'admin_only' => false,
                    'order' => [
                        'column' => 'title',
                        'value' => 'asc'
                    ]
                ],
                [ 'roomCapacity' ],
                $request, false);

            // get fee
            $fees = $this->feeRepo
                ->with([ 'rooms', 'adjusted_past_collection' ])
                ->when(!is_null($type), function ($query) use ($type) // normal or casual type
                {
                    return $query->where('fee_type', $type);
                });

            //access
            $fees = $this->attachAccessibilityQuery($fees)->get();

            /*------------------------------------------------------------*/

            $response = [
                'children' => new ChildResourceCollection($children),
                'rooms' => new RoomResourceCollection($rooms),
                'fees' => new FeesResourceCollection($fees, [ 'adjusted_past_future' => true ]),
            ];

            // include enrolment reasons
            if(!is_null($get_abs_reason)) $response['abs_reason'] = CCSType::BOOKING_ABSENCE_REASON;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getOccupancy(Request $request)
    {
        try
        {
            $bookings = $this->bookingRepo->masterRollOccupancy([], $request);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $bookings = [];
        }

        return (new BookingResourceCollection($bookings, []))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * Store bulk bookings
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(MasterRollBookingStoreRequest::class);

            // store
            $this->bookingRepo->bulkStore($request, 'ChildRoomSyncJob', 'FeeAdjusted');

             DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update/delete bulk bookings
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            //validation
            app(MasterRollBookingUpdateRequest::class);

            $action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;

            // get children
            $childList = $this->childRepo->get(
                [ 'reference' => Helpers::decodeHashedID($request->input('children')) ],
                [ 'rooms' ],
                $request,
                false
            );

            // update
            $result = $this->bookingRepo->masterRollBulkUpdate(
                $request,
                $childList,
                $action,
                'Fee',
                'FeeAdjusted',
                'ChildAttendance'
            );

            // update room sync
            $this->bookingRepo->updateChildRoomSync(
                $childList,
                array_values(array_unique(array_map(function($i) { return Helpers::decodeHashedID($i['room']); }, $result['slots']))),
                $result['slots'],
                $result['room_update'],
                'ChildRoomSyncJob'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && !empty($result['removed_attendance']))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => $result['removed_attendance'],
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText(($action === '0') ?  'response.success_update' : 'response.success_delete')
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get booking slots for bulk creation
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function previewSlots(Request $request)
    {
        try
        {
            //validation
            app(MasterRollBookingsPreviewRequest::class);

            $room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;

            //get children
            $childList = $this->childRepo
                ->with(['rooms'])
                // ->whereHas('rooms', function($query) use ($room_id) { return $query->where('id', $room_id); })
                ->whereIn('id', Helpers::decodeHashedID($request->input('children')))
                ->get();

            // get slots
            $dateList = $this->bookingRepo->masterRollGetBookingsPreviewSlots(
                $childList,
                $request,
                $room_id
            );

            // check if preview slots available
            if (empty($dateList))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.slots_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $dateList
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get booking preview slots for bulk update or delete
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function manageBookingsPreviewSlots(Request $request)
    {
        try
        {
            //validation
            app(MasterRollManageBookingsPreviewRequest::class);

            //get children
            $childList = $this->childRepo->whereIn('id', Helpers::decodeHashedID($request->input('children')))->get();

            // get slots
            $dateList = $this->bookingRepo->masterRollGetManageBookingsPreviewSlots(
                $childList,
                $request,
                'Room',
                'Fee'
            );

            // check if preview slots available
            if(empty($dateList))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.slots_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $dateList
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getBookingHistory() {

    }
}
