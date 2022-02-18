<?php

namespace Kinderm8\Http\Controllers;

use Illuminate\Http\Request;
use Kinderm8\Repositories\User\IUserRepository;
use ErrorHandler;
use Exception;
use Helpers;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Enums\RequestType;
use Illuminate\Support\Facades\DB;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Http\Resources\ContactReportResourceCollection;
use Kinderm8\Repositories\Contactreport\IContactReportRepository;
use Kinderm8\Repositories\ReportFieldSave\IReportFieldSaveRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use RequestHelper;
use LocalizationHelper;

class ContactReportController extends Controller
{
    use UserAccessibility;

    private $contactReportRepo;
    private $fieldSaveReportRepo;
    private $childRepo;
    private $roomRepo;
    private $userRepo;

    public function __construct(IContactReportRepository $contactReportRepo, IReportFieldSaveRepository $fieldSaveReportRepo, IChildRepository $childRepo, IRoomRepository $roomRepo, IUserRepository $userRepo)
    {
        $this->contactReportRepo = $contactReportRepo;
        $this->fieldSaveReportRepo = $fieldSaveReportRepo;
        $this->childRepo = $childRepo;
        $this->roomRepo = $roomRepo;
        $this->userRepo = $userRepo;
    }

    public function view(Request $request)
    {
        if(substr($request->input('type'), 0, 9) === 'CON_PACDR')
        {
            $data = $this->contactReportRepo->getContactParentAndChildReport($request,'Child');

            // return (new ContactReportResourceCollection($data['list'], ['PACDR'=>true]))
            //     ->additional([
            //         'totalRecords' => $data['actual_count'],
            //     ])
            //     ->response()
            //     ->setStatusCode(RequestType::CODE_200);
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );

        }

        if(substr($request->input('type'), 0, 8) === 'CON_CECR')
        {
            $data = $this->contactReportRepo->ChildEmergencyContactsReport($request, 'Child', 'ChildEmergencyContact');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );

            // return (new ContactReportResourceCollection($data['list'], ['CECR'=>true]))
            //     ->additional([
            //         'totalRecords' => $data['actual_count'],
            //     ])
            //     ->response()
            //     ->setStatusCode(RequestType::CODE_200);

        }

        if(substr($request->input('type'), 0, 7) === 'CON_EDR')
        {
            $data = $this->contactReportRepo->educatorDetailsReport($request, 'User', 'Child', 'Room');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );
            // return (new ContactReportResourceCollection($data['list'], ['EDR'=>true]))
            //     ->additional([
            //         'totalRecords' => $data['actual_count'],
            //     ])
            //     ->response()
            //     ->setStatusCode(RequestType::CODE_200);
        }

        if(substr($request->input('type'), 0, 7) === 'CON_EQR')
        {
            $data = $this->contactReportRepo->educatorDetailsReport($request, 'User', 'Child', 'Room');

            $data = [
                'list'=> [],
                'actual_count'=> 0
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );
            // return (new ContactReportResourceCollection($data['list'], ['EQR'=>true]))
            //     ->additional([
            //         'totalRecords' => $data['actual_count'],
            //     ])
            //     ->response()
            //     ->setStatusCode(RequestType::CODE_200);


        }
        if(substr($request->input('type'), 0, 7) === 'CCR')
        {
            $data = $this->contactReportRepo->ChildEmergencyContactsReport($request, 'Child', 'ChildEmergencyContact', 'true');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );

        }
    }

    public function viewPrimaryPayerReport(Request $request){

        try
        {

            $data = $this->contactReportRepo->viewPrimaryPayerReport($request,'Child');

            DB::commit();

            return (new ChildResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function saveField(Request $request)
    {
        DB::beginTransaction();
        try
        {

            $field = $this->fieldSaveReportRepo->saveField($request);

            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText($field['type']?'response.success_create' :'response.success_update' ),
                    $field
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getReportData(Request $request)
    {
        try
        {
            $field = $this->fieldSaveReportRepo->getField($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $field['list']
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function addFavorite(Request $request)
    {
        DB::beginTransaction();
        try
        {

            $id  = Helpers::decodeHashedID($request->input('id'));
            $report = $this->fieldSaveReportRepo->addFavorite($id, $request);

            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $report
                ), RequestType::CODE_201);
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

            $id  = Helpers::decodeHashedID($request->input('id'));
            $report = $this->fieldSaveReportRepo->delete($id);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getAllChildren(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->childRepo->get(['status'=>'1',
                                            'order'=>[
                                                'column' => 'first_name',
                                                'value' => 'asc',
                                                ]
                                        	],
                                            [], $request, false);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new ChildResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getAllRooms(Request $request)
    {
        $data = [];

        try
        {
            if($request->input('getadminonlyrooms') && $request->input('getadminonlyrooms') == 'true')
            {
                $data = $this->roomRepo->get(
                    ['status'=>'0'],
                    ['roomCapacity'],
                    $request,
                    false
                );
            }
            else
            {
                $data = $this->roomRepo->get(
                    ['status'=>'0','admin_only' => false],
                    ['roomCapacity'],
                    $request,
                    false
                );
            }

            return (new RoomResourceCollection($data))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function listAccounts(Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {

            $accounts = $this->userRepo->getAllActiveParents($request);

            // $accounts = User::Parent()->whereHas('child', function($query) {
            //     $query->where('status', '=', '1');
            // })
            // ->with(['child', 'parentPaymentMethods', 'bond' ,'transactions' => function ($query) {
            //     $query->orderBy('id', 'desc');
            // }]);

            // $accounts->where('organization_id', '=', auth()->user()->organization_id)
            //         ->where('branch_id', '=', auth()->user()->branch_id);

            // $accounts = $accounts->orderBy('first_name', 'asc')->get();

            return (new UserResourceCollection($accounts, ['financeAccounts' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function updateReportName(Request $request)
    {
        DB::beginTransaction();
        try
        {

            $id  = Helpers::decodeHashedID($request->input('id'));
            $report = $this->fieldSaveReportRepo->updateName($id, $request->input('name'));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $report
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
