<?php

namespace Kinderm8\Http\Controllers;

use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use DBHelper;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonPeriod;
use CCSHelpers;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use RequestHelper;
use LocalizationHelper;
use Kinderm8\ParentDataMigration;
use Kinderm8\Sample4;
use Kinderm8\User;
use Kinderm8\ChildEmergencyContact;
use Kinderm8\Role;
use Kinderm8\Child;
use Kinderm8\Enums\RoleType;
use DateTime;
use ErrorHandler;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;

class ParentDataMigrationController extends Controller
{

    private $userRepo;
    private $snsService;

    public function __construct(SNSContract $snsService, IUserRepository $userRepo)
    {
        $this->snsService = $snsService;
        $this->userRepo = $userRepo;
    }

    public function migrateUser(Request $request)
    {
        DB::beginTransaction();
        try
        {
            $user_array = [];
            $child_in_kinder_pay_array = [];

            \Log::info('main function work');
            \Log::info($request->all());
            $users = Sample4::all();

            if($request->input('type') === true) {

                \Log::info('import user 2 only start working');
                foreach( $users as $user) {
                       \Log::info('==============Going to add user===========');
                       if($user['Parent 2 Email'] !== null){

                            $user_id2_only = $this->addUser2DataOnly($user, $request);
                            array_push($user_array, $user_id2_only);
                       }

                    }

            }
            if ($request->input('kponly') === true){

                \Log::info('emergency KP fn work');
                $child_attendance_id = [];
                foreach($users as $child){

                    $id = $child['childkinderpayid'];
                    $existing_userid =  null;
                    $first_name = $child['first_name'];
                    $last_name = $child['last_name'];
                    // $first_name = $child['full_name'] == trim($child['full_name']) && strpos($child['full_name'], ' ') !== false ? explode(" ", $child['full_name'])[0] : null;
                    // $last_name = $child['full_name'] == trim($child['full_name']) && strpos($child['full_name'], ' ') !== false ? explode(" ", $child['full_name'])[1] : null;
                    $address = $child['address'] ? $child['address'] : null;
                    $email = $child['email'] ? strtolower(trim($child['email'])) : 'noreply@kinderm8.com.au';
                    $phone = $child['phone_no'];
                    $mobile = $child['mobile_no'];
                    $relationship = $child['relationship'];
                    $password = bcrypt('EmergencyContactPassword');

                    \Log::info('type'.$child['types']);

                    $consentEmergencyContact = strpos($child['types'],'Emergency') !== false ? true : false;
                    $consentCollectChild = strpos($child['types'],'Collection') !== false ? true : false;
                    $consentMakeMedicalDecision = strpos($child['types'],'Medical') !== false ? true : false;
                    $consentIncursion = strpos($child['types'],'Excursion') !== false ? true : false;
                    $consentDrop = strpos($child['types'],'DropOffPickUp') !== false ? true : false;
                    $consentTransport = strpos($child['types'],'Transportation') !== false ? true : false;

                    $types = array();
                    if($consentEmergencyContact){
                        array_push($types, 'Emergency');
                    }
                    if($consentCollectChild){
                        array_push($types, 'Collection');
                    }
                    if($consentMakeMedicalDecision){
                        array_push($types, 'Medical');
                    }
                    if($consentIncursion){
                        array_push($types, 'Excursion');
                    }
                    if($consentDrop){
                        array_push($types, 'DropOffPickUp');
                    }
                    if($consentTransport){
                        array_push($types, 'Transportation');
                    }

                    //check user if exist
                    $exist_user = User::where('first_name', '=', $first_name)
                                        ->where('last_name', '=', $last_name)
                                        ->where('phone', '=', $mobile)
                                        ->where('branch_id', '=', Helpers::decodeHashedID($request->input('branch')))
                                        ->first();
                    if(!$exist_user){
                        \Log::info('user not exist');
                        $userAcc2 = new User();
                        $userAcc2->organization_id = Helpers::decodeHashedID($request->input('org'));
                        $userAcc2->branch_id = Helpers::decodeHashedID($request->input('branch'));
                        $userAcc2->currentgen_id = null;
                        $userAcc2->email = $email;
                        $userAcc2->first_name = $first_name;
                        $userAcc2->last_name = $last_name;
                        $userAcc2->dob =  null;
                        $userAcc2->password = $password;
                        $userAcc2->phone2 = $phone;
                        $userAcc2->phone = $mobile;
                        $userAcc2->address_1 = $address;
                        $userAcc2->status = '0';
                        $userAcc2->email_verified = true;
                        $userAcc2->login_access =  '0';
                        $userAcc2->pincode =  null;
                        $userAcc2->save();

                        $roles = Role::where('name', '=','emergency-contact')->get()->first();
                        $userAcc2->assignRole($roles->id);

                        unset($roles);
                        $existing_userid = $userAcc2->id;

                    }
                    else{
                        \Log::info('user exist');
                        $existing_userid = $exist_user->id;
                    }

                    $exist_emergency_user = ChildEmergencyContact::where('first_name', '=', $first_name)
                                        ->where('last_name', '=', $last_name)
                                        ->where('child_profile_id','=', $id)
                                        ->where('phone', '=', $mobile)
                                        ->where('phone2', '=', $phone)
                                        ->where('user_id', '=', $existing_userid)->first();

                    // \Log::info('exist_emergency_user==> '. $exist_emergency_user->id);
                    if(!$exist_emergency_user) {

                        \Log::info('emergency contact not exist');
                        $emergencyObj = new ChildEmergencyContact();
                        $emergencyObj->child_profile_id = $id;
                        $emergencyObj->currentgen_id = $child['currentgen_id'];
                        $emergencyObj->user_id = $existing_userid;
                        $emergencyObj->first_name = $first_name;
                        $emergencyObj->last_name = $last_name;
                        $emergencyObj->address = $address;
                        $emergencyObj->email = $email;
                        $emergencyObj->phone2 = $phone;
                        $emergencyObj->phone = $mobile;
                        $emergencyObj->relationship = $relationship;
                        $emergencyObj->types = $types;
                        $ecContactConsents = [
                            'consent_incursion' => $consentIncursion,
                            'consent_make_medical_decision' => $consentMakeMedicalDecision,
                            'consent_emergency_contact' => $consentEmergencyContact,
                            'consent_collect_child' => $consentCollectChild,
                            'consent_drop_off_and_pick_up_child'=> $consentDrop,
                            'consent_transportation'=> $consentTransport
                        ];
                        $emergencyObj->consents = $ecContactConsents;
                        $emergencyObj->save();
                    }

                    else{
                        \Log::info('emergency contact exist');
                        $exist_emergency_user->child_profile_id = $id;
                        $exist_emergency_user->currentgen_id = $child['currentgen_id'];
                        $exist_emergency_user->user_id = $existing_userid;
                        $exist_emergency_user->first_name = $first_name;
                        $exist_emergency_user->last_name = $last_name;
                        $exist_emergency_user->address = $address;
                        $exist_emergency_user->email = $email;
                        $exist_emergency_user->phone2 = $phone;
                        $exist_emergency_user->phone = $mobile;
                        $exist_emergency_user->relationship = $relationship;
                        $exist_emergency_user->types = $types;
                        $ecContactConsents = [
                            'consent_incursion' => $consentIncursion,
                            'consent_make_medical_decision' => $consentMakeMedicalDecision,
                            'consent_emergency_contact' => $consentEmergencyContact,
                            'consent_collect_child' => $consentCollectChild,
                            'consent_drop_off_and_pick_up_child'=> $consentDrop,
                            'consent_transportation'=> $consentTransport
                        ];
                        $exist_emergency_user->consents = $ecContactConsents;
                        $exist_emergency_user->save();
                    }
                        array_push($user_array, $existing_userid);
                        array_push($child_in_kinder_pay_array, $id);
                }

            }

            if ($request->input('kpKconnect') === true){

                \Log::info('emergency KP and KC fn work');
                $child_attendance_id = [];
                foreach($users as $child){

                    $id = $child['childkinderpayid'];
                    $existing_userid =  null;
                    $first_name = $child['first_name'];
                    $last_name = $child['last_name'];
                    // $first_name = $child['full_name'] == trim($child['full_name']) && strpos($child['full_name'], ' ') !== false ? explode(" ", $child['full_name'])[0] : null;
                    // $last_name = $child['full_name'] == trim($child['full_name']) && strpos($child['full_name'], ' ') !== false ? explode(" ", $child['full_name'])[1] : null;
                    $address = $child['address'] ? $child['address'] : null;
                    $email = $child['email'] ? strtolower(trim($child['email'])) : 'noreply@kinderm8.com.au';
                    $phone = $child['phone_no'];
                    $mobile = $child['mobile_no'];
                    $relationship = $child['relationship'];
                    $password = bcrypt('EmergencyContactPassword');

                    \Log::info('type'.$child['types']);

                    $consentEmergencyContact = strpos($child['types'],'Emergency') !== false ? true : false;
                    $consentCollectChild = strpos($child['types'],'Collection') !== false ? true : false;
                    $consentMakeMedicalDecision = strpos($child['types'],'Medical') !== false ? true : false;
                    $consentIncursion = strpos($child['types'],'Excursion') !== false ? true : false;
                    $consentDrop = strpos($child['types'],'DropOffPickUp') !== false ? true : false;
                    $consentTransport = strpos($child['types'],'Transportation') !== false ? true : false;

                    $types = array();
                    if($consentEmergencyContact){
                        array_push($types, 'Emergency');
                    }
                    if($consentCollectChild){
                        array_push($types, 'Collection');
                    }
                    if($consentMakeMedicalDecision){
                        array_push($types, 'Medical');
                    }
                    if($consentIncursion){
                        array_push($types, 'Excursion');
                    }
                    if($consentDrop){
                        array_push($types, 'DropOffPickUp');
                    }
                    if($consentTransport){
                        array_push($types, 'Transportation');
                    }

                    //check user if exist
                    $exist_user = User::where('first_name', '=', $first_name)
                                        ->where('last_name', '=', $last_name)
                                        ->where('phone', '=', $mobile)
                                        ->where('branch_id', '=', Helpers::decodeHashedID($request->input('branch')))
                                        ->first();
                    if(!$exist_user){
                        \Log::info('user not exist');
                        $userAcc2 = new User();
                        $userAcc2->organization_id = Helpers::decodeHashedID($request->input('org'));
                        $userAcc2->branch_id = Helpers::decodeHashedID($request->input('branch'));
                        $userAcc2->currentgen_id = null;
                        $userAcc2->email = $email;
                        $userAcc2->first_name = $first_name;
                        $userAcc2->last_name = $last_name;
                        $userAcc2->dob =  null;
                        $userAcc2->password = $password;
                        $userAcc2->phone2 = $phone;
                        $userAcc2->phone = $mobile;
                        $userAcc2->address_1 = $address;
                        $userAcc2->status = '0';
                        $userAcc2->email_verified = true;
                        $userAcc2->login_access =  '0';
                        $userAcc2->pincode =  null;
                        $userAcc2->save();

                        $roles = Role::where('name', '=','emergency-contact')->get()->first();
                        $userAcc2->assignRole($roles->id);

                        unset($roles);
                        $existing_userid = $userAcc2->id;

                    }
                    else{
                        \Log::info('user exist');
                        $existing_userid = $exist_user->id;
                    }

                    $exist_emergency_user = ChildEmergencyContact::where('first_name', '=', $first_name)
                                        ->where('last_name', '=', $last_name)
                                        ->where('child_profile_id','=', $id)
                                        ->where('phone', '=', $mobile)
                                        ->where('phone2', '=', $phone)
                                        ->where('user_id', '=', $existing_userid)->first();

                    // \Log::info('exist_emergency_user==> '. $exist_emergency_user->id);
                    if(!$exist_emergency_user) {

                        \Log::info('emergency contact not exist');
                        $emergencyObj = new ChildEmergencyContact();
                        $emergencyObj->child_profile_id = $id;
                        $emergencyObj->currentgen_id = $child['currentgen_id'];
                        $emergencyObj->user_id = $existing_userid;
                        $emergencyObj->first_name = $first_name;
                        $emergencyObj->last_name = $last_name;
                        $emergencyObj->address = $address;
                        $emergencyObj->email = $email;
                        $emergencyObj->phone2 = $phone;
                        $emergencyObj->phone = $mobile;
                        $emergencyObj->relationship = $relationship;
                        $emergencyObj->types = $types;
                        $ecContactConsents = [
                            'consent_incursion' => $consentIncursion,
                            'consent_make_medical_decision' => $consentMakeMedicalDecision,
                            'consent_emergency_contact' => $consentEmergencyContact,
                            'consent_collect_child' => $consentCollectChild,
                            'consent_drop_off_and_pick_up_child'=> $consentDrop,
                            'consent_transportation'=> $consentTransport
                        ];
                        $emergencyObj->consents = $ecContactConsents;
                        $emergencyObj->save();
                    }
                    else{
                        \Log::info('emergency contact exist');
                        $exist_emergency_user->child_profile_id = $id;
                        $exist_emergency_user->currentgen_id = $child['currentgen_id'];
                        $exist_emergency_user->user_id = $existing_userid;
                        $exist_emergency_user->first_name = $first_name;
                        $exist_emergency_user->last_name = $last_name;
                        $exist_emergency_user->address = $address;
                        $exist_emergency_user->email = $email;
                        $exist_emergency_user->phone2 = $phone;
                        $exist_emergency_user->phone = $mobile;
                        $exist_emergency_user->relationship = $relationship;
                        $exist_emergency_user->types = $types;
                        $ecContactConsents = [
                            'consent_incursion' => $consentIncursion,
                            'consent_make_medical_decision' => $consentMakeMedicalDecision,
                            'consent_emergency_contact' => $consentEmergencyContact,
                            'consent_collect_child' => $consentCollectChild,
                            'consent_drop_off_and_pick_up_child'=> $consentDrop,
                            'consent_transportation'=> $consentTransport
                        ];
                        $exist_emergency_user->consents = $ecContactConsents;
                        $exist_emergency_user->save();
                    }
                        array_push($user_array, $existing_userid);
                        array_push($child_in_kinder_pay_array, $id);
                }
            }

            if($request->input('attendance') === true) {
                $child_attendance_id = [];
                \Log::info('==============attendance only===========');
                foreach($users as $child){

                    $child_object = Child::where('first_name', '=', $child['Child First Name'])
                                    ->where('last_name', '=', $child['Child Last Name'])
                                    ->where('branch_id', '=', Helpers::decodeHashedID($request->input('branch')))
                                    ->first();
                    if($child_object) {
                        $child_object->attendance = $request->input('attendanceType') === '0' ? $this->setAttendance($child['Child Schedule']) : $this->getChildAttendanceSingle($child['Child Schedule']);
                        $child_object->save();

                        array_push($child_attendance_id, $child_object->id);
                    }

                    else{
                        \Log::info('child not found');
                    }

                }

                \Log::info($child_attendance_id);
            }

            if($request->input('kponly') !== true && $request->input('kpKconnect') !== true && $request->input('attendance') !== true && $request->input('type') !== true) {
                foreach( $users as $user) {
                        $user_id = null;

                        if($user['Parent 1 Email'] !== null || $user['Parent 1 Email'] !== '' && !Helpers::IsNullOrEmpty($user['Parent 1 Email'])){

                            $user_id = $this->addUserData($user, $request);

                        }
                        $child_id = $this->addChild($user, $request,$user_id);

                        if($user_id !== null) {

                            array_push($user_array, $user_id);
                        }

                        if($user['Parent 2 Email'] !== null && !Helpers::IsNullOrEmpty($user['Parent 2 Email'])) {

                            $user_id2 = $this->addUserData2($user, $request,$child_id);
                            array_push($user_array, $user_id2);
                        }

                        unset($user_id);

                    }
            }


            \Log::info('==============Task Completed===========');
            \Log::info($user_array);

            $user = User::with(['organization', 'branch', 'roles', 'child'])->whereIn('id', $user_array)->get();
            // \Log::info($user);

            DB::commit();

            if($request->input('kpKconnect') === true) {

                \Log::info('==============start send  child sns===========');
                \Log::info($child_in_kinder_pay_array);
                foreach ($child_in_kinder_pay_array as $child_id) {

                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => Helpers::decodeHashedID($request->input('org')),
                            'branch' => Helpers::decodeHashedID($request->input('branch')),
                            'subjectid' =>  $child_id,
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                    \Log::info("Child Emergency Create SNS sent child id => ".$child_id);
            }
            \Log::info('==============end child sns===========');
            }

            \Log::info('============== Complete all SNS ===========');
            return response()
                ->json(RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new UserResourceCollection($user)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function addUserData($user, $request) {

        // DB::beginTransaction();
        try {

            \Log::info('==============add user 1 start===========');

            $id = null;
            $existing_user = User::where('email',strtolower(trim($user['Parent 1 Email'])))
                                    ->where('branch_id',Helpers::decodeHashedID($request->input('branch')))
                                    ->first();
            if(!$existing_user) {

                if($this->checkDataValidity($user)) {

                    $userAcc = new User;
                    $userAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
                    $userAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));
                    $userAcc->currentgen_id = $user['currentgen id'];
                    $userAcc->email = strtolower(trim($user['Parent 1 Email']));
                    $userAcc->first_name = $user['Parent 1 First Name'];
                    $userAcc->last_name = $user['Parent 1 Last Name'];
                    $userAcc->dob = $user['Parent 1 Dob'] !== null ?  DateTime::createFromFormat('d/m/Y', $user['Parent 1 Dob'])->format('Y-m-d'): '9999-12-31';
                    $userAcc->password = bcrypt('12345678');
                    $userAcc->ccs_id = $user['Parent 1 Crn'];
                    $userAcc->phone = $user['Parent 1 Mobile'];
                    $userAcc->address_1 = $user['Parent 1 Address'];
                    $userAcc->city = $user['Parent 1 Suburb'];
                    $userAcc->state = $user['Parent 1 State'];
                    $userAcc->zip_code = $user['Parent 1_Postcode'];
                    $userAcc->status = $user['child_status'] === 'Active'? '0' : '1';

                    $userAcc->country_code = $user['country_code1'];
                    $userAcc->work_phone = $user['work_phone1'];
                    $userAcc->work_mobile = $user['work_mobile1'];

                    $userAcc->email_verified = false;
                    $userAcc->login_access =  '1';
                    $userAcc->save();
                    //set user reference
                    $firstUserAcc = $userAcc;

                    //attach roles to user
                $roles = Role::where('type',RoleType::PARENTSPORTAL )
                                ->where('organization_id', Helpers::decodeHashedID($request->input('org')))
                                ->where('name', '=', 'parent')
                                ->first();
                if($roles) {
                    $userAcc->assignRole($roles->id);
                }
                else {
                    $roles = Role::where('type',RoleType::PARENTSPORTAL )
                                ->where('organization_id', null)
                                ->where('name', '=', 'parent')
                                ->first();
                    $userAcc->assignRole($roles->id);
                }

                    unset($roles);
                    $id = $userAcc->id;
                }
            }

            else {

                $id = $existing_user->id;
            }

            \Log::info('==============add user 1 done===========');
            return $id;


        }
        catch(Exception $e)
        {
            // DB::rollBack();
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function addUserData2($user, $request, $child_id) {
        try {

            \Log::info('==============add user 2 start===========');
            \Log::info($user['Parent 2 Email']);
            $id = null;

            $existing_user = User::where('email',strtolower(trim($user['Parent 2 Email'])))
                                    ->where('branch_id',Helpers::decodeHashedID($request->input('branch')))
                                    ->first();

            if(!$existing_user) {

                \Log::info('==============user 2 email not there so create new user 2===========');
                $userAcc2 = new User;
                $userAcc2->organization_id = Helpers::decodeHashedID($request->input('org'));
                $userAcc2->branch_id = Helpers::decodeHashedID($request->input('branch'));
                $userAcc2->currentgen_id = $user['currentgen id'];
                $userAcc2->email = strtolower(trim($user['Parent 2 Email']));
                $userAcc2->first_name = $user['Parent 2 First Name'];
                $userAcc2->last_name = $user['Parent 2 Last Name'];
                $userAcc2->dob =  $user['Parent 2 Dob'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Parent 2 Dob'])->format('Y-m-d'): '9999-12-31';//date("Y-m-d", strtotime($user['Parent 2 Dob']));//DateTimeHelper::convertDateToDBFormat($user['Parent 2 Dob'],'Y-m-d');//'2020-08-19';//str_replace("/","-",$user['Parent 1 Dob']);
                $userAcc2->password = bcrypt('12345678');
                $userAcc2->ccs_id = $user['Parent 2 Crn'];
                $userAcc2->phone = $user['Parent 2 Mobile'];
                $userAcc2->address_1 = $user['Parent 2 Address'];
                $userAcc2->city = $user['Parent 2 Suburb'];
                $userAcc2->state = $user['Parent 2 State'];
                $userAcc2->zip_code = $user['Parent 2_Postcode'];
                $userAcc2->status = $user['child_status'] === 'Active'? '0' : '1';
                $userAcc2->email_verified = false;
                $userAcc2->login_access =  '1';

                $userAcc2->country_code = $user['country_code2'];
                $userAcc2->work_phone = $user['work_phone2'];
                $userAcc2->work_mobile = $user['work_mobile2'];

                $userAcc2->save();
                //set user reference
                $firstUserAcc = $userAcc2;

                //attach roles to user
                $roles = Role::where('type',RoleType::PARENTSPORTAL )
                            ->where('organization_id', Helpers::decodeHashedID($request->input('org')))
                            ->where('name', '=', 'parent')
                            ->first();
                if($roles) {
                    $userAcc2->assignRole($roles->id);
                }
                else {
                    $roles = Role::where('type',RoleType::PARENTSPORTAL )->where('organization_id', null)
                    ->where('name', '=', 'parent')
                    ->first();
                    $userAcc2->assignRole($roles->id);
                }

                unset($roles);
                $childAcc = Child::find($child_id);

                $childAcc->parents()->attach([$userAcc2->id => ['primary_contact'=>false, 'primary_payer'=>false]]);
                $id =  $userAcc2->id;

            }

            else{

                $id =  $existing_user->id;
            }

            // DB::commit();
            \Log::info('==============add user 2 done===========');
            return $id;

        }
        catch(Exception $e)
        {
            // DB::rollBack();
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function addChild($user, $request, $user_id) {

        // DB::beginTransaction();
        \Log::info('==============add child start===========');
        try {
            $childAcc = new Child;
            $childAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
            $childAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));
            $childAcc->currentgen_id = $user['currentgen id'];
            $childAcc->created_by = auth()->user()->id;
            $childAcc->first_name = $user['Child First Name'];
            $childAcc->last_name = $user['Child Last Name'];
            $childAcc->gender = $user['Gender'] === 'M' ? '0' : '1';
            $childAcc->dob =  $user['Child Dob'] !==null ? DateTime::createFromFormat('d/m/Y', $user['Child Dob'])->format('Y-m-d'): '9999-12-31';
            $childAcc->enrollment_start_date = $user['Enrolment Start'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Enrolment Start'])->format('Y-m-d') : null;
            $childAcc->enrollment_end_date = $user['Enrolment End'] !== null ?  DateTime::createFromFormat('d/m/Y', $user['Enrolment End'])->format('Y-m-d'): null;

            $childAcc->attendance = $request->input('attendanceType') === '0' ? $this->setAttendance($user['Child Schedule']) : $this->getChildAttendanceSingle($user['Child Schedule']);
            $childAcc->child_description =  null;
            $childAcc->nappy_option_required = '0';
            $childAcc->bottle_feed_option_required = '0';
            $childAcc->ccs_id = $user['Child Crn'];
            $childAcc->status = $user['child_status'] === 'Active'? '1' : '0';
            $childAcc->join_date = $user['Enrolment Start'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Enrolment Start'])->format('Y-m-d') : null;

            $childAcc->legal_first_name = $user['Child Legal First Name'] ? $user['Child Legal First Name'] : null;
            $childAcc->legal_last_name = $user['Child Legal Last Name'] ? $user['Child Legal Last Name']: null;

            $childAcc->save();

            //attach user to user
            if($user_id !== null && !Helpers::IsNullOrEmpty($user_id)) {

                $childAcc->parents()->attach([$user_id => ['primary_contact'=>true, 'primary_payer'=>true]]);
            }
            unset($user_id);
            $childAcc->rooms()->attach($user['Room ID']);
            $firstUserAcc = $childAcc;

            // DB::commit();
            \Log::info('==============add child done===========');
            return $childAcc->id;
        }
        catch(Exception $e)
        {
            // DB::rollBack();
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function setAttendance($atte){

        \Log::info(explode(" ",$atte));

        \Log::info(preg_split('/[\ \n\,]+/', $atte));

        $attentance_array = [];
        foreach(preg_split('/[\ \n\,]+/', $atte) as $day){

            $days = array(0 => 'SUNDAY', 1 => 'MONDAY', 2 => 'TUESDAY', 3 => 'WEDNESDAY',4 => 'THURSDAY', 5 => 'FRIDAY', 6 => 'SATURDAY');
            // $days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
            $dayFull;
            if($day === 'Monday') {
                $dayFull = 'MONDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Tuesday') {
                $dayFull = 'TUESDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Wednesday') {
                $dayFull = 'WEDNESDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Thursday') {
                $dayFull = 'THURSDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Friday') {
                $dayFull = 'FRIDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Sunday') {
                $dayFull = 'SUNDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Saturday') {
                $dayFull = 'SATURDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
        }

        \Log::info('attendance array');
        \Log::info($attentance_array);
        return DateTimeHelper::getDaysInWeek($attentance_array);
        //'[{"name": "sunday", "index": 0, "is_weekend": true}, {"name": "monday", "index": 1, "is_weekend": false}, {"name": "tuesday", "index": 2, "is_weekend": false}, {"name": "wednesday", "index": 3, "is_weekend": false}, {"name": "thursday", "index": 4, "is_weekend": false}, {"name": "friday", "index": 5, "is_weekend": false}, {"name": "saturday", "index": 6, "is_weekend": true}]';
        // DateTimeHelper::getDaysInWeek(explode(" ",$atte));
    }

    public function checkDataValidity($user) {
        if($user['Parent 1 First Name'] === '' || $user['Parent 1 Last Name'] === '' || $user['Parent 1 Email'] === '') {
            \Log::info('not null');
            return false;
        }
        else {
            return true;
        }

    }

    public function addUser2DataOnly($user, $request) {

        // DB::beginTransaction();
        try {

            \Log::info('==============add user 2 start===========');
            \Log::info($user['Parent 2 Email']);
            $id = null;
            $existing_user = User::where('email',strtolower(trim($user['Parent 2 Email'])))
            ->where('branch_id',Helpers::decodeHashedID($request->input('branch')))
            ->first();
                if(!$existing_user) {

                \Log::info('==============user 2 email not there so create new user 2===========');
                $userAcc2 = new User;
                $userAcc2->organization_id = Helpers::decodeHashedID($request->input('org'));
                $userAcc2->branch_id = Helpers::decodeHashedID($request->input('branch'));
                $userAcc2->currentgen_id = $user['currentgen id'];
                $userAcc2->email = strtolower(trim($user['Parent 2 Email']));
                $userAcc2->first_name = $user['Parent 2 First Name'];
                $userAcc2->last_name = $user['Parent 2 Last Name'];
                $userAcc2->dob =  $user['Parent 2 Dob'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Parent 2 Dob'])->format('Y-m-d'): '9999-12-31';//date("Y-m-d", strtotime($user['Parent 2 Dob']));//DateTimeHelper::convertDateToDBFormat($user['Parent 2 Dob'],'Y-m-d');//'2020-08-19';//str_replace("/","-",$user['Parent 1 Dob']);
                $userAcc2->password = bcrypt('12345678');
                $userAcc2->ccs_id = $user['Parent 2 Crn'];
                $userAcc2->phone = $user['Parent 2 Mobile'];
                $userAcc2->address_1 = $user['Parent 2 Address'];
                $userAcc2->city = $user['Parent 2 Suburb'];
                $userAcc2->state = $user['Parent 2 State'];
                $userAcc2->zip_code = $user['Parent 2_Postcode'];
                $userAcc2->status = strtolower($user['child_status']) === 'active'? '0' : '1';
                $userAcc2->email_verified = false;
                $userAcc2->login_access =  '1';

                $userAcc2->country_code = $user['country_code2'];
                $userAcc2->work_phone = $user['work_phone2'];
                $userAcc2->work_mobile = $user['work_mobile2'];
                $userAcc2->save();
                //set user reference
                $firstUserAcc = $userAcc2;

                //attach roles to user
                $roles = Role::where('type',RoleType::PARENTSPORTAL )
                            ->where('organization_id', Helpers::decodeHashedID($request->input('org')))
                            ->where('name', '=', 'parent')
                            ->first();
                if($roles) {
                    $userAcc2->assignRole($roles->id);
                }
                else {
                    $roles = Role::where('type',RoleType::PARENTSPORTAL )->where('organization_id', null)
                    ->where('name', '=', 'parent')
                    ->first();
                    $userAcc2->assignRole($roles->id);
                }
                unset($roles);

                $childAcc = Child::where('organization_id', Helpers::decodeHashedID($request->input('org')))
                ->where('branch_id', '=',  Helpers::decodeHashedID($request->input('branch')))
                ->where('first_name', '=', $user['Child First Name'])
                ->where('last_name', '=', $user['Child Last Name'])
                ->first();

                if($childAcc) {

                    $childAcc->parents()->attach([$userAcc2->id => ['primary_contact'=>false, 'primary_payer'=>false]]);
                }

                $id =  $userAcc2->id;

            }

            else{

                \Log::info('USER EXIST');
                // $exist_user = User::where('email', strtolower(trim($user['Parent 1 Email'])))->first();
                $id =  $existing_user->id;
            }

            // DB::commit();
            \Log::info('==============add user 2 done===========');
            return $id;

        }
        catch(Exception $e)
        {
            // DB::rollBack();
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getChildAttendanceSingle($atte){

        \Log::info(explode(",",$atte));

        $attentance_array = [];
        foreach(explode(",",$atte) as $day){

            $days = array(0 => 'SUNDAY', 1 => 'MONDAY', 2 => 'TUESDAY', 3 => 'WEDNESDAY',4 => 'THURSDAY', 5 => 'FRIDAY', 6 => 'SATURDAY');
            // $days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
            $dayFull;
            if($day === 'M') {
                $dayFull = 'MONDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'T') {
                $dayFull = 'TUESDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'W') {
                $dayFull = 'WEDNESDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'Th') {
                $dayFull = 'THURSDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'F') {
                $dayFull = 'FRIDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'SU') {
                $dayFull = 'SUNDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
            if($day === 'SA') {
                $dayFull = 'SATURDAY';
                array_push($attentance_array,array_search($dayFull, $days));
            }
        }

        \Log::info($attentance_array);
        return DateTimeHelper::getDaysInWeek($attentance_array);

    }

}
