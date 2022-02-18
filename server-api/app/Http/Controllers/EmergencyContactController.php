<?php

namespace Kinderm8\Http\Controllers;

use Helpers;
use Illuminate\Http\Request;
use Kinderm8\ChildEmergencyContact;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\EmergencyContactCollection;
use Kinderm8\Http\Resources\EmergencyContactResource;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\EmergencyContact\IEmergencyContactRepository;
use LocalizationHelper;
use RequestHelper;
use DB;
use ErrorHandler;
use Log;

class EmergencyContactController extends Controller
{
    private $emergencyContactRepo;
    private $snsService;
    private $userRepo;
    private $childRepo;

    public function __construct(IEmergencyContactRepository $emergencyContactRepo, SNSContract $snsService, IUserRepository $userRepo, IChildRepository $childRepo)
    {
        $this->emergencyContactRepo = $emergencyContactRepo;
        $this->snsService = $snsService;
        $this->userRepo = $userRepo;
        $this->childRepo = $childRepo;
    }

    public function addEmergency(Request $request)
    {

        DB::beginTransaction();

        try {

            $children = is_array($request->input('child_id')) ? $request->input('child_id') : array($request->input('child_id'));
            $user_id = Helpers::IsNullOrEmpty($request->input('user_id')) ? null : Helpers::decodeHashedID($request->input('user_id'));

            foreach($children as $child) {
                $id = Helpers::decodeHashedID($child);

                if (!$user_id) {

                    //store user
                    $request['role_name'] = 'emergency-contact';
                    $request['password'] = bcrypt('EmergencyContactPassword');
                    $request['status'] = '0';
                    $request['address1'] = $request->input('address');

                    $userAcc = $this->userRepo->store($request, 'Role');
                    $request['user_id'] = Helpers::hxCode($userAcc->id);
                    $user_id = $userAcc->id;

                }

                $this->childRepo->setEmergencyContact($id, $user_id, $request);

                // send sns if branch is connected to current gen (kinder connect)
                if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect) {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                            'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                            'subjectid' => $id,
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                    \Log::info("Child Emergency Create SNS sent child id => " . $id);
                }

            }

            DB::commit();

            $childObj =  $this->childRepo->findById($id, ['emergencyContacts', 'parents']);
            $response = new ChildResource($childObj);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $response
                ), RequestType::CODE_201);

        }
        catch (\Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
    }

    public function updateEmergency(Request $request){

        // $id = $request->input('id');

        DB::beginTransaction();
        try {

            $child_id = Helpers::decodeHashedID($request->input('child_id'));
            $user_id = Helpers::decodeHashedID($request->input('id'));
            //update emergency contact
            // $emergencyObj = $this->emergencyContactRepo->update($id, $request);

            $this->childRepo->detachEmergencyContact($child_id, $user_id);

            $this->childRepo->setEmergencyContact($child_id, $user_id, $request);


            $userAcc = $this->userRepo->find($user_id);

            if($userAcc){

                $userAcc->first_name = $request->input('firstname');
                $userAcc->last_name =  $request->input('lastname');
                $userAcc->address_1 = $request->input('address');
                $userAcc->email = $request->input('email');
                $userAcc->phone = $request->input('phone');
                $userAcc->phone2 = $request->input('mobile');
                $userAcc->pincode = $request->input('pincode');

                $userAcc->save();
            }

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $child_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
                \Log::info("Child Emergency UPDATE SNS sent child id => ".$child_id);
            }


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_201);
        }
        catch (\Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
    }

    public function getEmergencyContacts(Request $request){

        try {

            $id = Helpers::decodeHashedID($request->input('index'));

            $childObj =  $this->childRepo->findById($id, ['emergencyContacts']);

            return (new EmergencyContactCollection($childObj->emergencyContacts))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        }
        catch (\Exception $e){

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

    public function deleteEmergency(Request $request){

        try {


            $child_id = Helpers::decodeHashedID($request->input('child_id'));
            $user_id = Helpers::decodeHashedID($request->input('user_id'));

            $this->childRepo->detachEmergencyContact($child_id, $user_id);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $child_id,
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
                \Log::info("Child Emergency DELETE SNS sent child id => ".$child_id);
            }

            $user = $this->userRepo->findById($user_id, []);
            if($user->isEmergencyContact()){

                $userEmergencyContacts = $this->emergencyContactRepo->getEmergencyContactsByUser($user_id);

                if(count($userEmergencyContacts) == 0){

                    // delete user object if there are no children linked
                    $this->userRepo->delete($user_id);

                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_201);

        }
        catch (\Exception $e){
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

    public function getParentEmergencyContacts(){
        try {
//            $emergency_contacts = $this->emergencyContactRepo->getEmergencyContactsByParent();
            $user_id = Auth()->user()->id;
            $childList = $this->childRepo->with(['emergencyContacts'])->where('status', '=', 1)
                ->whereHas('parents', function($query) use($user_id) {
                    $query->where('user_id', '=', $user_id);
                })
                ->where('branch_id', '=', Auth()->user()->branch_id)
                ->get();

            $emergency_contacts = array();
            foreach($childList as $child){
                foreach($child->emergencyContacts as $contact){
                    array_push($emergency_contacts, $contact);
                }
            }

            return (new EmergencyContactCollection($emergency_contacts))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        }
        catch (\Exception $e){
            ErrorHandler::log($e);
            $emergency_contacts = [];
        }

        return (new EmergencyContactCollection($emergency_contacts))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function deviceGetParentEmergencyContacts(){

        try
        {
            $user_id = Auth()->user()->id;

            $children = $this->childRepo->with(['emergencyContacts'])->where('status', '=', 1)

                ->whereHas('parents', function($query) use($user_id) {

                    $query->where('user_id', '=', $user_id);

                })
                ->where('branch_id', '=', Auth()->user()->branch_id)
                ->get();

            $response = [];
            foreach($children as $child){

                $response[] = [
                    'full_name' => $child->full_name,
                    'index' => $child->index,
                    'emergency_contacts' => new EmergencyContactCollection($child->emergencyContacts,[ 'mobile_api' => true ])
                ];


            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $response
                ), RequestType::CODE_200);

        }
        catch (\Exception $e){

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function deviceAddEmergency(Request $request)
    {

        DB::beginTransaction();

        try {
            $children = json_decode($request->input('child_id'));

            if (is_null($children))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'Please Insert Child id'
                    ), RequestType::CODE_404);
            }

            $phone_exists = $this->userRepo
                ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                ->where('phone', '=', $request->input('phone'))
                ->count();

            if ($phone_exists > 0)
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'Mobile number already exists, Please enter different mobile number'
                    ), RequestType::CODE_404);
            }

            if($request->input('email') != '') {

                $email_exists = $this->userRepo
                    ->where('branch_id', auth()->user()->branch_id ? auth()->user()->branch_id : null)
                    ->where('email', '=', $request->input('email'))
                    ->orWhere('second_email', '=', $request->input('email'))
                    ->count();

                if ($email_exists > 0) {
                    return response()->json(
                        RequestHelper::sendResponse(RequestType::CODE_404, 'Email already exists, Please enter different email address'
                        ), RequestType::CODE_404);
                }

            }else{
                $request['email'] = 'noreply@kinderm8.com.au';
            }

			//store user
			$request['role_name'] = 'emergency-contact';
			$request['password'] = bcrypt('EmergencyContactPassword');
			$request['status'] = '0';
			$request['address1'] = $request->input('address');

			$userAcc = $this->userRepo->store($request, 'Role');
			$user_id = $userAcc->id;

            foreach($children as $child) {

                $id = Helpers::decodeHashedID($child);
                $this->childRepo->setEmergencyContact($id, $user_id, $request);

                // send sns if branch is connected to current gen (kinder connect)
                if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect) {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                            'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                            'subjectid' => $id,
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                    \Log::info("Child Emergency Create SNS sent child id => " . $id);
                }

            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_200);

        }
        catch (\Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceUpdateEmergency(Request $request){

        DB::beginTransaction();
        try {

            $child_id = Helpers::decodeHashedID($request->input('child_id'));

            $user_id = Helpers::decodeHashedID($request->input('user_id'));
            $userAcc = $this->userRepo->find($user_id);

            if (is_null($userAcc))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'User Not Found'
                    ), RequestType::CODE_404);
            }

            $phone_exists = $this->userRepo
                ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                ->where('id', '!=', $user_id)
                ->where('phone', '=', $request->input('phone'))
                ->count();

            if ($phone_exists > 0)
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'Mobile number already exists, Please enter different mobile number'
                    ), RequestType::CODE_404);
            }

            if($request->input('email') != '') {

                $email_exists = $this->userRepo
                    ->where('branch_id', auth()->user()->branch_id ? auth()->user()->branch_id : null)
                    ->where('id', '!=', $user_id)
                    ->where('email', '=', $request->input('email'))
                    ->orWhere('second_email', '=', $request->input('email'))
                    ->count();

                if ($email_exists > 0) {
                    return response()->json(
                        RequestHelper::sendResponse(RequestType::CODE_404, 'Email already exists, Please enter different email address'
                        ), RequestType::CODE_404);
                }

            }else{
                $request['email'] = 'noreply@kinderm8.com.au';
            }

            $this->childRepo->detachEmergencyContact($child_id, $user_id);

            $this->childRepo->setEmergencyContact($child_id, $user_id, $request);

            //update user
            $userAcc->first_name = $request->input('firstname');
            $userAcc->last_name =  $request->input('lastname');
            $userAcc->address_1 = $request->input('address');
            $userAcc->email = $request->input('email');
            $userAcc->phone = $request->input('phone');
            $userAcc->phone2 = $request->input('mobile');
            $userAcc->pincode = $request->input('pincode');

            $userAcc->save();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $child_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
                \Log::info("Child Emergency UPDATE SNS sent child id => ".$child_id);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_200);
        }
        catch (\Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
