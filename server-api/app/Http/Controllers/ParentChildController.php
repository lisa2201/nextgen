<?php

namespace Kinderm8\Http\Controllers;
use DateTimeHelper;
use DB;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Child;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Requests\ChildStoreRequest;
use Kinderm8\Http\Requests\ChildUpdateRequest;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Http\Resources\CCSEnrolmentResourceCollection;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\User;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\CCSEnrolment;
use CCSHelpers;
use Kinderm8\Http\Resources\CCSEnrolmentResource;
use Kinderm8\HealthAndMedical;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use PaymentHelpers;

class ParentChildController extends Controller
{
    private $userRepo;
    private $bookingRepo;
    private $attendanceRepo;
    private $enrolmentRepo;
    private $ccsEntitlementRepo;
    private $childRepo;
    private $snsService;

    public function __construct(IBookingRepository $bookingRepo, IUserRepository $userRepo, IAttendanceRepository $attendanceRepo, ICCSEnrolmentRepository $enrolmentRepo, ICCSEntitlementRepository $ccsEntitlementRepo, IChildRepository $childRepo, SNSContract $snsService)
    {
        $this->userRepo = $userRepo;
        $this->bookingRepo = $bookingRepo;
        $this->attendanceRepo = $attendanceRepo;
        $this->enrolmentRepo = $enrolmentRepo;
        $this->ccsEntitlementRepo = $ccsEntitlementRepo;
        $this->childRepo = $childRepo;
        $this->snsService = $snsService;
    }

    public function get() {
        $actualCount = 0;
        try
        {
            $childLidt = User::with(['child'])
                      ->find(auth()->user()->id);

            $childLidt = $childLidt->child->where('branch_id', '=', auth()->user()->branch_id);

            $actualCount = $childLidt->count();

            if (is_null($childLidt))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

             return (new ChildResourceCollection($childLidt))
             ->additional([
                'total' => $actualCount
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

        }

    public function view(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('index'));

            $rowObj = Child::with(['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'health_medical', 'documents', 'allergy'])->find($id);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    public function acceptCWA(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));
            $rowObj = CCSEnrolment::find($id);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            $rowObj->parent_status = 2;
            $rowObj->save();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new CCSEnrolmentResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    public function deviceAcceptCWA(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));
            $rowObj = CCSEnrolment::find($id);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            $rowObj->parent_status = 2;
            $rowObj->save();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new CCSEnrolmentResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    public function getParentDashboardBalance(Request $request){

        try{
            
            $amount = PaymentHelpers::getRunningTotal(auth()->user()->id, true, null, null);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $amount
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function getParentDashboardPayment(Request $request){

        try{
            $child_id = null;
            $user = $this->userRepo->with(['child', 'parentPayments'])->find(auth()->user()->id);
            if($request->input('child_id') != ''){
                $child_id =  Helpers::decodeHashedID($request->input('child_id'));

            }else{
                $children = $user->child->where('status', '=', '1')->where('branch_id', '=', auth()->user()->branch_id);
                if (!is_null($children)) {
                    $child_id = $children->first()['id'];
                }
            }

            $payment = '0.00';

            if (!is_null($child_id))
            {
                if(count($user->parentPayments) > 0) {
                    $transaction = $user->parentPayments->where('status', 'completed')->last();

                    if ($transaction) {
                        $payment = $transaction['amount'];
                    }
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $payment
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getParentDashboardBookings(Request $request){

        try{
            $child_id = null;
            if($request->input('child_id') != ''){
                $child_id =  Helpers::decodeHashedID($request->input('child_id'));

            }else{
                $user = $this->userRepo->with(['child'])->find(auth()->user()->id);

                $children = $user->child->whereNull('deleted_at')->where('status', '=', '1')->where('branch_id', '=', auth()->user()->branch_id);
                if (!is_null($children)) {
                    $child_id = $children->first()['id'];
                }
            }

            if (!is_null($child_id))
            {
                $today_bookings = $this->bookingRepo
                    ->with(['attendance'])
                    ->where('child_id', $child_id)
                    ->where('date', now()->format('Y-m-d'))
                    ->orderBy('session_start', 'ASC')
                    ->get();

                $dt = now();
                foreach($today_bookings as $today_booking){

                    $start_time = DateTimeHelper::formatMinToTimeArray($today_booking->session_start);
                    $dt->hour((int) $start_time['hour'])->minute((int) $start_time['min'])->second(0);
                    $session_start =  $dt->format('g:i A');

                    $end_time = DateTimeHelper::formatMinToTimeArray($today_booking->session_end);
                    $dt->hour((int) $end_time['hour'])->minute((int) $end_time['min'])->second(0);
                    $session_end =  $dt->format('g:i A');

                    $today_booking['time_range'] =  $session_start.' - '.$session_end;
                    $today_booking['status'] =  $today_booking->status;
                    $today_booking['signin_time'] =  '';
                    $today_booking['signin_person'] =  '';
                    $today_booking['signout_time'] =  'N/A';
                    $today_booking['signout_person'] =  '';

                    if($today_booking->attendance != ''){
                        if($today_booking->attendance->drop_time != null){
                            $time = DateTimeHelper::formatMinToTimeArray($today_booking->attendance->drop_time);
                            $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                            $today_booking['signin_time'] =  $dt->format('g:i A');
                        }
                        if($today_booking->attendance->drop_user != null){
                            $today_booking['signin_person'] =  $today_booking->attendance->dropper->full_name;
                        }
                        if($today_booking->attendance->pick_time != null){
                            $time = DateTimeHelper::formatMinToTimeArray($today_booking->attendance->pick_time);
                            $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                            $today_booking['signout_time'] =  $dt->format('g:i A');
                        }
                        if($today_booking->attendance->pick_user != null){
                            $today_booking['signout_person'] =  $today_booking->attendance->picker->full_name;
                        }
                    }
                }

                if(count($today_bookings) == 0){
                    $today_bookings = [array(
                        'time_range' =>  '',
                        'signin_time' => '',
                        'signin_person' =>  '',
                        'signout_time' => '',
                        'signout_person' => ''
                    )];
                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        $today_bookings
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Children not found'
                    ), RequestType::CODE_200);

            }

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getParentDashboardYTD(Request $request)
    {
        try
        {
            $child_id = null;
            $user = $this->userRepo->with(['child', 'child.ccs_enrolment'])->find(auth()->user()->id);
            $children = $user->child
                ->whereNull('deleted_at')
                ->where('status', '=', '1')
                ->where('branch_id', '=', auth()->user()->branch_id);

            if($request->input('child_id') != '') {
                $child_id = Helpers::decodeHashedID($request->input('child_id'));
                $children = $children->where('id', '=', $child_id);
            }

            $ytdData = array(
                'absence_count' =>  0,
                'remaining_count' => 42
            );

            if (count($children) > 0){

                $enrolments = new CCSEnrolmentResourceCollection($children->first()->ccs_enrolment);

                if (count($enrolments) > 0){

                    $ccs_api_response = $this->ccsEntitlementRepo
                        ->where('enrolment_id', $enrolments[0]->enrolment_id)
                        ->where('date', '>=', Carbon::now()->format('Y-m-d'))
                        ->first();

                    if ($ccs_api_response) {
                        $ytdData = array(
                            'absence_count' =>  $ccs_api_response['absence_count'],
                            'remaining_count' => 42 - $ccs_api_response['absence_count']
                        );
                    }
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $ytdData
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }


    public function updateChild(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $childAcc = $this->childRepo->updateParentLogin(
                Helpers::decodeHashedID($request->input('id')),
                $request,
                'ChildCulturalDetails'
            );

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childAcc->id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildResource($childAcc)
                ), RequestType::CODE_200);
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

    public function deviceUpdateChild(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $childAcc = $this->childRepo->updateParentLogin(
                Helpers::decodeHashedID($request->input('id')),
                $request,
                'ChildCulturalDetails'
            );

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childAcc->id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildResource($childAcc)
                ), RequestType::CODE_200);
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

    public function updateHealthMedical(Request $request)
    {
        DB::beginTransaction();
        try {
            if($request->input('id') != ''){

                $medicalInfo =   HealthAndMedical::find(Helpers::decodeHashedID($request->input('id')));
                $action = 'update';

            }

            else
            {

                $medicalInfo =  new HealthAndMedical();
                $medicalInfo->child_id = Helpers::decodeHashedID($request->input('childId'));
                $action = 'create';

            }
            $medicalInfo->ref_no = $request->input('ref_no');
            $medicalInfo->medicare_expiry_date = $request->input('medicare_expiry_date');
            $medicalInfo->ambulance_cover_no = $request->input('ambulance_cover_no');
            $medicalInfo->health_center = $request->input('health_center');
            $medicalInfo->service_name = $request->input('service_name');
            $medicalInfo->service_phone_no = $request->input('service_phone_no');
            $medicalInfo->service_address = $request->input('service_address');

            $medicalInfo->save();

            $childAcc = Child::with(['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'health_medical', 'documents', 'allergy'])->find($medicalInfo->child_id);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $medicalInfo->child_id,
                        'action' => ($action == 'create') ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();



            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildResource($childAcc)
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


    public function deviceUpdateHealthMedical(Request $request)
    {
        DB::beginTransaction();
        try {
            if($request->input('id') != ''){

                $medicalInfo =   HealthAndMedical::find(Helpers::decodeHashedID($request->input('id')));
                $action = 'update';

            }

            else
            {

                $medicalInfo =  new HealthAndMedical();
                $medicalInfo->child_id = Helpers::decodeHashedID($request->input('childId'));
                $action = 'create';

            }
            $medicalInfo->ref_no = $request->input('ref_no');
            $medicalInfo->medicare_expiry_date = $request->input('medicare_expiry_date');
            $medicalInfo->ambulance_cover_no = $request->input('ambulance_cover_no');
            $medicalInfo->health_center = $request->input('health_center');
            $medicalInfo->service_name = $request->input('service_name');
            $medicalInfo->service_phone_no = $request->input('service_phone_no');
            $medicalInfo->service_address = $request->input('service_address');

            $medicalInfo->save();

            $childAcc = Child::with(['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'health_medical', 'documents', 'allergy'])->find($medicalInfo->child_id);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $medicalInfo->child_id,
                        'action' => ($action == 'create') ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();



            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildResource($childAcc)
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

}
