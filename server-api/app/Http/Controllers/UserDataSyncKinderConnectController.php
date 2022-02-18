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
use Kinderm8\UserDataSyncKinderConnect;
use Kinderm8\User;
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
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;

class UserDataSyncKinderConnectController extends Controller
{

    private $snsService;

    public function __construct(SNSContract $SNSService)
    {
        $this->snsService = $SNSService;
    }
    public function migrateUser(Request $request)
    {
        DB::beginTransaction();
        try
        {

            $users = UserDataSyncKinderConnect::all();
            $user_array = [];
            $child_array = [];
            $user_id = null;
            $child_id = null;
            foreach( $users as $user) {

               \Log::info('==============Going to add user===========');
               $user_id = $this->addUserData($user, $request);
                $child_id = $this->addChild($user, $request,$user_id);
                if($user_id) {
                    array_push($user_array, $user_id);
                }
                if($child_id) {
                    array_push($child_array, $child_id);
                }

                if($user['Parent 2 Email'] !== null) {

                    \Log::info('Create user 2');
                    $user_id2 = $this->addUserData2($user, $request,$child_id);
                    if($user_id2) {
                        array_push($user_array, $user_id2);
                    }
                    // array_push($user_array, $user_id2);
                }

            }

            \Log::info('==============Task Completed in KP===========');
            \Log::info('==============user id in KP===========');
            \Log::info($user_array);
            \Log::info('==============child id in KP===========');
            \Log::info($child_array);

            $user = User::with(['organization', 'branch', 'roles', 'child'])->whereIn('id', $user_array)->get();

            DB::commit();

            \Log::info('==============start send  user sns===========');
            foreach ($user_array as $user_id) {
                $userAcc = User::where('id', $user_id)->first();
                \Log::info('==============Found user===========');
                \Log::info($userAcc);

                if($userAcc->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                        [
                            'organization' => $userAcc->organization_id,
                            'branch' => $userAcc->branch_id,
                            'subjectid' => $userAcc->id,
                            'role' => $userAcc->getRoleTypeForKinderConnect(),
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::USER_SUBJECT
                    );
                }
            }
            \Log::info('==============end send  user sns===========');

            \Log::info('==============start send  child sns===========');

            foreach ($child_array as $child_id) {
                $childAcc = Child::where('id', $child_id)->first();

                \Log::info('==============Found child===========');

                if($childAcc->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => $childAcc->organization_id,
                            'branch' => $childAcc->branch_id,
                            'subjectid' =>  $childAcc->id,
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                }
            }
            \Log::info('==============end send  child sns===========');
            \Log::info('==============Task Completed in KP & KC ===========');

            return (new UserResourceCollection($user))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
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
            if($user['Parent 1 Email'] !== null) {

                $existing_user = User::where('email',strtolower(trim($user['Parent 1 Email'])))
                                    ->where('branch_id',Helpers::decodeHashedID($request->input('branch')))
                                    ->first();

                if(!$existing_user) {

                    $userAcc = new User;
                    $userAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
                    $userAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));

                    $userAcc->email = strtolower(trim($user['Parent 1 Email']));
                    $userAcc->first_name = $user['Parent 1 First Name'];
                    $userAcc->last_name = $user['Parent 1 Last Name'];
                    $userAcc->dob = $user['Parent 1 Dob'] !== null || $user['Parent 1 Dob'] !== ''?  DateTime::createFromFormat('d/m/Y', $user['Parent 1 Dob'])->format('Y-m-d'): '9999-12-31';
                    $userAcc->password = bcrypt('12345678');
                    $userAcc->ccs_id = $user['Parent 1 Crn'];
                    $userAcc->phone = $user['Parent 1 Mobile'];
                    $userAcc->address_1 = $user['Parent 1 Address'];
                    $userAcc->city = $user['Parent 1 Suburb'];
                    $userAcc->state = $user['Parent 1 State'];
                    $userAcc->zip_code = $user['Parent 1_Postcode'];
                    $userAcc->status = $user['child_status'] === 'Active'? '0' : '1';
                    $userAcc->email_verified = false;
                    $userAcc->login_access =  '1';

                    $userAcc->country_code = $user['country_code1'];
                    $userAcc->work_phone = $user['work_phone1'];
                    $userAcc->work_mobile = $user['work_mobile1'];

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

                else {

                    $id = $existing_user->id;
                }
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

    public function isUserNotExist($email, $branchId){

        return User::where('email',$email)->where('branch_id', $branchId)->count() < 1 ? true : false;
    }

    public function addUserData2($user, $request, $child_id) {

        // DB::beginTransaction();
        try {

            \Log::info('==============add user 2 start===========');
            $id = null;
            $existing_user = User::where('email',strtolower(trim($user['Parent 2 Email'])))
                                    ->where('branch_id',Helpers::decodeHashedID($request->input('branch')))
                                    ->first();
            if(!$existing_user) {

                \Log::info('==============user 2 not found so going to inser data===========');
                $userAcc = new User;
                $userAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
                $userAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));

                $userAcc->email = strtolower(trim($user['Parent 2 Email']));
                $userAcc->first_name = $user['Parent 2 First Name'];
                $userAcc->last_name = $user['Parent 2 Last Name'];
                $userAcc->dob =  $user['Parent 2 Dob'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Parent 2 Dob'])->format('Y-m-d'): '9999-12-31';//date("Y-m-d", strtotime($user['Parent 2 Dob']));//DateTimeHelper::convertDateToDBFormat($user['Parent 2 Dob'],'Y-m-d');//'2020-08-19';//str_replace("/","-",$user['Parent 1 Dob']);
                $userAcc->password = bcrypt('12345678');
                $userAcc->ccs_id = $user['Parent 2 Crn'];
                $userAcc->phone = $user['Parent 2 Mobile'];
                $userAcc->address_1 = $user['Parent 2 Address'];
                $userAcc->city = $user['Parent 2 Suburb'];
                $userAcc->state = $user['Parent 2 State'];
                $userAcc->zip_code = $user['Parent 2_Postcode'];
                $userAcc->status = $user['child_status'] === 'Active'? '0' : '1';
                $userAcc->email_verified = false;
                $userAcc->login_access =  '1';

                $userAcc->country_code = $user['country_code2'];
                $userAcc->work_phone = $user['work_phone2'];
                $userAcc->work_mobile = $user['work_mobile2'];

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
                    ->where('name', '=', 'parent')
                    ->where('organization_id', null)->first();
                    $userAcc->assignRole($roles->id);
                }

                unset($roles);
                $childAcc = Child::find($child_id);

                if($childAcc){

                    $childAcc->parents()->attach([$userAcc->id => ['primary_contact'=>false, 'primary_payer'=>false]]);
                }

                $id =  $userAcc->id;

            }

            else{

                $id =  $existing_user? $existing_user->id : null;
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
            $child_id = null;
            $child_check = Child::where('first_name','=', $user['Child First Name'])
                                ->where('last_name','=', $user['Child Last Name'])
                                ->where('branch_id','=', Helpers::decodeHashedID($request->input('branch')))->first();
            if(!$child_check) {

                $childAcc = new Child;
                $childAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
                $childAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));

                $childAcc->created_by = auth()->user()->id;
                $childAcc->first_name = $user['Child First Name'];
                $childAcc->last_name = $user['Child Last Name'];
                $childAcc->gender = $user['Gender'] === 'M' ? '0' : '1';
                $childAcc->dob =  $user['Child Dob'] !==null ? DateTime::createFromFormat('d/m/Y', $user['Child Dob'])->format('Y-m-d'): '9999-12-31';
                $childAcc->enrollment_start_date = $user['Enrolment Start'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Enrolment Start'])->format('Y-m-d') : null;
                $childAcc->enrollment_end_date = $user['Enrolment End'] !== null ?  DateTime::createFromFormat('d/m/Y', $user['Enrolment End'])->format('Y-m-d'): null;

                $childAcc->attendance = $this->setAttendance($user['Child Schedule']);//'[{"name": "sunday", "index": 0, "is_weekend": true}, {"name": "monday", "index": 1, "is_weekend": false}, {"name": "tuesday", "index": 2, "is_weekend": false}, {"name": "wednesday", "index": 3, "is_weekend": false}, {"name": "thursday", "index": 4, "is_weekend": false}, {"name": "friday", "index": 5, "is_weekend": false}, {"name": "saturday", "index": 6, "is_weekend": true}]';
                $childAcc->child_description =  null;
                $childAcc->nappy_option_required = '0';
                $childAcc->bottle_feed_option_required = '0';
                $childAcc->ccs_id = $user['Child Crn'];
                $childAcc->status = $user['child_status'] === 'Active'? '1' : '0';
                $childAcc->join_date = $user['Enrolment Start'] !== null ? DateTime::createFromFormat('d/m/Y', $user['Enrolment Start'])->format('Y-m-d') : null;
                $childAcc->legal_first_name = $user['Child Legal First Name'] ? $user['Child Legal First Name'] : null;
                $childAcc->legal_last_name = $user['Child Legal Last Name'] ? $user['Child Legal Last Name']: null;
                $childAcc->save();

                $child_id = $childAcc->id;

                //attach user to user

                if($user_id) {
                    $childAcc->parents()->attach([$user_id => ['primary_contact'=>true, 'primary_payer'=>true]]);
                }
                // $childAcc->parents()->attach($user_id);
                // $childAcc->rooms()->detach();
                $childAcc->rooms()->attach($user['Room ID']);
            }
            else {

                $child_check->rooms()->attach($user['Room ID']);

            }



            // $firstUserAcc = $childAcc;

            // DB::commit();
            \Log::info('==============add child done===========');
            return $child_id;
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
        // foreach(explode(" ",$atte) as $day){

        //     $days = array(0 => 'SUNDAY', 1 => 'MONDAY', 2 => 'TUESDAY', 3 => 'WEDNESDAY',4 => 'THURSDAY', 5 => 'FRIDAY', 6 => 'SATURDAY');
        //     // $days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
        //     $dayFull;
        //     if($day === 'M') {
        //         $dayFull = 'MONDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'T') {
        //         $dayFull = 'TUESDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'W') {
        //         $dayFull = 'WEDNESDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'Th') {
        //         $dayFull = 'THURSDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'F') {
        //         $dayFull = 'FRIDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'SU') {
        //         $dayFull = 'SUNDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        //     if($day === 'SA') {
        //         $dayFull = 'SATURDAY';
        //         array_push($attentance_array,array_search($dayFull, $days));
        //     }
        // }

        \Log::info($attentance_array);
        return DateTimeHelper::getDaysInWeek($attentance_array);
        //'[{"name": "sunday", "index": 0, "is_weekend": true}, {"name": "monday", "index": 1, "is_weekend": false}, {"name": "tuesday", "index": 2, "is_weekend": false}, {"name": "wednesday", "index": 3, "is_weekend": false}, {"name": "thursday", "index": 4, "is_weekend": false}, {"name": "friday", "index": 5, "is_weekend": false}, {"name": "saturday", "index": 6, "is_weekend": true}]';
        // DateTimeHelper::getDaysInWeek(explode(" ",$atte));
    }
}
