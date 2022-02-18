<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Services\AWS\SNSContract;
use ErrorHandler;
use Exception;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Booking;
use Kinderm8\Enums\RequestType;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\StaffAttendance\IStaffAttendanceRepository;
use Kinderm8\Child;
use Kinderm8\Room;
use Kinderm8\User;
use RequestHelper;
use Helpers;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Http\Resources\AttendanceResourceCollection;
use Kinderm8\Http\Resources\StaffAttendanceResource;
use Kinderm8\Http\Resources\StaffAttendanceResourceCollection;
use LocalizationHelper;
use DB;
use Log;

class KioskController extends Controller
{
    private $attendanceRepo;
    private $branchRepo;
    private $userRepo;
    private $childRepo;
    private $bookingRepo;
    private $feeRepo;
    private $staffAttendanceRepo;

    private $snsService;

    public function __construct(IAttendanceRepository $attendanceRepo, IBranchRepository $branchRepo, IUserRepository $userRepo, IChildRepository $childRepo, IBookingRepository $bookingRepo, IFeeRepository $feeRepo, IStaffAttendanceRepository $staffAttendanceRepo, SNSContract $SNSService)
    {
        $this->attendanceRepo = $attendanceRepo;
        $this->branchRepo = $branchRepo;
        $this->userRepo = $userRepo;
        $this->childRepo = $childRepo;
        $this->bookingRepo = $bookingRepo;
        $this->feeRepo = $feeRepo;
        $this->staffAttendanceRepo = $staffAttendanceRepo;
        $this->snsService = $SNSService;
    }

    // get client id for authorization api
    public function deviceGetClientId(Request $request)
    {
        try {
           $pincode =  $request->input('pincode');
           $data = $this->branchRepo->getClientId($pincode);

           if($data['client_id'] != null) {
               return response()->json(
                   RequestHelper::sendResponse(
                       RequestType::CODE_200,
                       'success',
                       $data
                   ), RequestType::CODE_200);
           }else{
               return response()->json(
                   RequestHelper::sendResponse(
                       RequestType::CODE_400,
                       'error',
                       'Client not found'
                   ), RequestType::CODE_400);
           }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get client id from domain
    public function GetClientIdByDomain(Request $request)
    {
        try {
           $domain =  $request->input('domain');
           $data = $this->branchRepo->getClientIdByDomain($domain);

           if($data['client_id'] != null) {
               return response()->json(
                   RequestHelper::sendResponse(
                       RequestType::CODE_200,
                       'success',
                       $data
                   ), RequestType::CODE_200);
           }else{
               return response()->json(
                   RequestHelper::sendResponse(
                       RequestType::CODE_400,
                       'error',
                       'Client not found'
                   ), RequestType::CODE_400);
           }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // validate user by mobile
    public function deviceGetClientByMobile(Request $request)
    {
        try {
            $phone =  $request->input('mobile');
            $user =  $this->userRepo->findByMobile($phone);

            if($user) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'success',
                        $user
                    ), RequestType::CODE_200);
            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'User not found'
                    ), RequestType::CODE_400);
            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function GetClientByMobile(Request $request)
    {
        try {
            $phone =  $request->input('mobile');
            $user =  $this->userRepo->findByMobile($phone);

            if($user) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'success',
                        new UserResource($user)
                    ), RequestType::CODE_200);
            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'User not found'
                    ), RequestType::CODE_400);
            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // create pincode
    public function deviceCreateParentPincode(Request $request)
    {
        try {
            $phone =  $request->input('mobile');
            $pincode =  $request->input('pincode');
            $user =  $this->userRepo->findByMobile($phone);

            if($user) {

                if($user->pincode == null) {
                    $user->pincode = $pincode;
                    $user->save();

                    // send sns if branch is connected to current gen (kinder connect)
                    if($user->branch->kinderconnect)
                    {
                        $this->snsService->publishEvent(
                            Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                            [
                                'organization' => $user->organization_id,
                                'branch' => $user->branch_id,
                                'subjectid' => $user->id,
                                'role' => $user->getRoleTypeForKinderConnect(),
                                'action' => CurrentGenConnectType::ACTION_UPDATE
                            ],
                            CurrentGenConnectType::USER_SUBJECT
                        );
                    }

                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_200,
                            'Pincode successfuly created'
                        ), RequestType::CODE_200);

                }else{
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'Pincode already created'
                        ), RequestType::CODE_400);
                }

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'User not found'
                    ), RequestType::CODE_400);
            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // reset pincode
    public function deviceResetParentPincode(Request $request)
    {
        try {

            $user = auth()->user();
            $pincode =  $request->input('pincode');

            if($pincode != '') {
                $user->pincode = $pincode;
                $user->save();

                // send sns if branch is connected to current gen (kinder connect)
                if($user->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                        [
                            'organization' => $user->organization_id,
                            'branch' => $user->branch_id,
                            'subjectid' => $user->id,
                            'role' => $user->getRoleTypeForKinderConnect(),
                            'action' => CurrentGenConnectType::ACTION_UPDATE
                        ],
                        CurrentGenConnectType::USER_SUBJECT
                    );
                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'Pincode successfuly changed'
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Pincode not found'
                    ), RequestType::CODE_400);
            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get all children attendance by day
    public function deviceGetAttendanceByDay(Request $request)
    {
        try {

            $attendance =  $this->attendanceRepo->getByDay($request, null, 'ChildNote');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $attendance
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get attendance by child
    public function deviceGetChildAttendance(Request $request)
    {
        try {

            $attendance =  $this->childRepo->getAttendance($request, 'ChildAttendance');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $attendance
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get child bookings
    public function deviceGetChildBookings(Request $request)
    {
        try
        {
            $bookings = $this->bookingRepo->kioskBookings($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $bookings
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // create drop and pick attendance
    public function deviceCreateAttendance(Request $request)
    {
        try {
            $response =  $this->attendanceRepo->createAttendance($request, 'Child', 'ChildNote', 'Booking');

            if(count($response['attendance_ids']) > 0){

                // send sns if branch is connected to current gen (kinder connect)
                if(auth()->user()->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                        [
                            'organization' => auth()->user()->organization_id,
                            'branch' => auth()->user()->branch_id,
                            'subjectid' => $response['attendance_ids'],
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::ATTENDANCE_SUBJECT
                    );
                }

                $records = $this->attendanceRepo->getById($response['attendance_ids'], 'ChildNote');

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'successfully updated',
                        $records
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        $response['status']
                    ), RequestType::CODE_400);

            }

        } catch (Exception $e) {
            // ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get children list
    public function deviceGetChildren(Request $request){

        try {

            if(auth()->user()->isParent())
            {
                $user_id = auth()->user()->id;
                $childList = Child::with(['rooms', 'ccs_enrolment', 'cultural_details', 'health_medical', 'allergy','documents'])
                    ->where('status', '=', 1)
                    ->where(function($query) use($user_id) {
                        $query->whereHas('parents', function($subquery) use($user_id) {
                            $subquery->where('user_id', '=', $user_id);
                        })
                        ->orWhereHas('emergency', function($subquery) use($user_id) {
                            $subquery->where('user_id', '=', $user_id);
                        });
                    })
                    ->where('branch_id', '=', auth()->user()->branch_id)
                    ->orderby('first_name', 'asc')
                    ->get();

                $date = ($request->input('date'))? $request->input('date') : strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));

                foreach($childList as $child){

                    $child['chid_id'] = $child['id'];
                    $child['attendance'] = $this->attendanceRepo->getByDay($request, $child['id'], 'ChildNote');
                    $child['bookings'] = Booking::with(['room','fee','attendance'])->where('child_id','=',$child['id'])
                        ->whereDate('date','=', $date)
                        ->get();
                    $child['primaryPayer'] = ($child->primaryPayer())? new UserResource($child->primaryPayer(), ['short' => true]) : null;
                }

            }else{
                $all_children = ($request->input('all_children') == 'true')? true: false;
                if($all_children){
                    $childList = Child::with(['rooms'])
                        ->where('status', '=', 1)
                        ->where('branch_id', '=', auth()->user()->branch_id)
                        ->get();

                }else{
                    $user_rooms = User::with(['rooms'])->find(auth()->user()->id);
                    $rooms = $user_rooms->rooms->pluck('id');

                    $childList = Child::with(['rooms'])
                        ->where('status', '=', 1)->whereHas('rooms', function($query) use($rooms) {
                            $query->whereIn('room_id', $rooms);
                        })
                        ->where('branch_id', '=', auth()->user()->branch_id)
                        ->get();

                }

                $date = ($request->input('date'))? $request->input('date') : strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));

                foreach($childList as $child){

                    $child['chid_id'] = $child['id'];
                    $child['attendance'] = $this->attendanceRepo->getByDay($request, $child['id'], 'ChildNote');
                    $child['bookings'] = Booking::where('child_id','=',$child['id'])
                        ->whereDate('date','=', $date)
                        ->get();
                    $parents = $child->parents;
                    unset($child->parents);
                    $child['parents'] = new UserResourceCollection($parents, ['short' => true]);
                }
            }

            $data['childList'] = $childList;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $data
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    // get children list by room
    public function deviceGetChildrenByRoom(Request $request){

        $room_id =  $request->input('room_id');

        if(auth()->user()->isParent())
        {
            $user_id = auth()->user()->id;
            $childList = Child::with(['rooms', 'ccs_enrolment', 'cultural_details', 'health_medical', 'allergy'])
                ->where('status', '=', 1)
                ->where(function($query) use($user_id) {
                    $query->whereHas('parents', function($subquery) use($user_id) {
                        $subquery->where('user_id', '=', $user_id);
                    })
                    ->orWhereHas('emergency', function($subquery) use($user_id) {
                        $subquery->where('user_id', '=', $user_id);
                    });
                })
                ->whereHas('rooms', function($query) use($room_id) {
                    $query->where('room_id', '=', $room_id);
                })
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->get();

            $date = ($request->input('date'))? $request->input('date') : strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));

            foreach($childList as $child){

                $child['chid_id'] = $child['id'];
                $child['attendance'] = $this->attendanceRepo->getByDay($request, $child['id'], 'ChildNote');
                $child['bookings'] = Booking::where('child_id','=', $child['id'])
                    ->whereDate('date','=', $date)
                    ->get();
                $child['primaryPayer'] = ($child->primaryPayer())? new UserResource($child->primaryPayer(), ['short' => true]) : null;
            }

        }else{
            $childList = Child::whereHas('rooms', function($query) use($room_id) {
                $query->where('room_id', '=', $room_id);
            })
                ->where('status', '=', 1)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->get();

            $date = ($request->input('date'))? $request->input('date') : strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));

            foreach($childList as $child){
                $child['chid_id'] = $child['id'];
                $child['attendance'] = $this->attendanceRepo->getByDay($request, $child['id'], 'ChildNote');
                $child['bookings'] = Booking::where('child_id','=', $child['id'])
                    ->whereDate('date','=', $date)
                    ->get();
                $parents = $child->parents;
                unset($child->parents);
                $child['parents'] = new UserResourceCollection($parents, ['short' => true]);
            }
        }

        $data['childList'] = $childList;
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                'success',
                $data['childList']
            ), RequestType::CODE_200);
    }

    // get staff rooms
    public function deviceGetStaffRooms(Request $request){

        try {
            $all_rooms = ($request->input('all_rooms') == 'true')? true: false;

            if(!auth()->user()->isParent()) {

                if($all_rooms){
                    $user_rooms = Room::all();

                }else{
                    $user_rooms = User::with(['rooms'])->find(auth()->user()->id);

                    foreach($user_rooms->rooms as $room){
                        $room['room_id'] = $room['id'];
                    }

                    $user_rooms = $user_rooms->rooms;

                }

                return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_200,
                            'success',
                            $user_rooms
                        ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Not an authorized user'
                    ), RequestType::CODE_400);
            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // get room data
    public function deviceGetRoom($id){

        $room = Room::find($id);
        if($room) {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $room
                ), RequestType::CODE_200);

        }else{
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    'Room not found'
                ), RequestType::CODE_400);
        }
    }

    //get missed attendance
    public function deviceGetMissedAttendance(Request $request){

        try {
            $attendances =  $this->attendanceRepo->getMissedAttendance($request, 'Child', 'ChildNote');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    [
                        'attendances' => $attendances
                    ]
                ), RequestType::CODE_200);


        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    //create missed attendance
    public function deviceCompleteMissedAttendance(Request $request){

        try {
            $response =  $this->attendanceRepo->updateMissedAttendance($request, 'Child', 'ChildNote');

            if($response['status'] != ''){
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        $response['status']
                    ), RequestType::CODE_400);

            }else{

                // send sns if branch is connected to current gen (kinder connect)
                if(auth()->user()->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                        [
                            'organization' => auth()->user()->organization_id,
                            'branch' => auth()->user()->branch_id,
                            'subjectid' => $response['attendance_ids'],
                            'action' => CurrentGenConnectType::ACTION_UPDATE
                        ],
                        CurrentGenConnectType::ATTENDANCE_SUBJECT
                    );
                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'success',
                        [
                            'attendances' => $response['attendances']
                        ]
                    ), RequestType::CODE_200);

            }


        } catch (Exception $e) {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceGetCasualFees(){

        try {
            $response =  $this->feeRepo
            ->with(['rooms'])
            ->where('branch_id', '=', auth()->user()->branch_id)
            ->where('fee_type', '=', '1')
            ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    [
                        'casual_fees' => $response
                    ]
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    //create staff attendance
    public function deviceCreateStaffAttendance(Request $request){

        DB::beginTransaction();

        try {
            DB::commit();

            $response = $this->staffAttendanceRepo->create($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new StaffAttendanceResource($response, [])
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            DB::rollBack();

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    //get staff attendance
    public function deviceGetStaffAttendance(Request $request){

        try {
            $response = $this->staffAttendanceRepo->getStaffAttendance($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    new StaffAttendanceResourceCollection($response, [])
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceDeleteStaffAttendance(Request $request){

        DB::beginTransaction();

        try {
            DB::commit();

            $removed_object = $this->staffAttendanceRepo->delete($request->input('id'));

            if($removed_object){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_delete')
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_400);

            }

        } catch (Exception $e) {
            DB::rollBack();

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    //temporary function
    public function xeroRedirect(Request $request)
    {
        log::info($request->header());
        log::info($request);

        if($request->header('referer') == 'https://authorize.xero.com/'){
            $domain = explode('|', $request->input('state'))[0];
            $url = 'https://'.$domain.'.kinderm8.com.au/dashboard/kiosk/xero-callback?code='.$request->input('code').'&scope='.$request->input('scope').'&session_state='.$request->input('session_state').'&state='.$request->input('state');
            log::info($url);
        }else{
            $url = 'https://go.xero.com';
        }

        return redirect()->away($url);
    }

}
