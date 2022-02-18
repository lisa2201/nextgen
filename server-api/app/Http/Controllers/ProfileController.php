<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Kinderm8\EmailTypes;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\User;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Services\AWS\SNSContract;

class ProfileController extends Controller
{


    private $snsService;

    public function __construct(SNSContract $SNSService)
    {

        $this->snsService = $SNSService;
    }

    public function get(){
       try
        {
            $rowObj = User::find(auth()->user()->id);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

             return (new UserResource($rowObj, ['profile'=>true]))
            ->additional([
                'child' => $rowObj->child
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

    public function update(Request $request) {
        DB::beginTransaction();
        try
        {
            $user_array = [];
            $userAcc = User::where('email','=',Auth()->user()->email)->get();

            $type = $request->input('type');

            if (is_null($userAcc || $userAcc->count() < 1))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

             if($type == 1) {

                foreach ($userAcc as $key => $user){
                    $user->first_name = $request->input('first');
                    $user->last_name = $request->input('last');
                    $user->dob = $request->input('dob');
                    $user->email = $request->input('email');
                    $user->second_email = $request->input('secondary_email');
                    $user->save();

                    array_push($user_array, $user);
                 }
             }

             if($type == 2) {

                foreach ($userAcc as $key => $user){
                    $user->phone2 = (! Helpers::IsNullOrEmpty($request->input('mobile'))) ? $request->input('mobile') : null;
                    $user->address_1 = (! Helpers::IsNullOrEmpty($request->input('address1'))) ? $request->input('address1') : null;
                    $user->address_2 = (! Helpers::IsNullOrEmpty($request->input('address2'))) ? $request->input('address2') : null;
                    $user->zip_code = (! Helpers::IsNullOrEmpty($request->input('zip'))) ? $request->input('zip') : null;
                    $user->city = (! Helpers::IsNullOrEmpty($request->input('city'))) ? $request->input('city') : null;
                    $user->state = (! Helpers::IsNullOrEmpty($request->input('state'))) ? $request->input('state') : null;
                    $user->country_code = (! Helpers::IsNullOrEmpty($request->input('country'))) ? $request->input('country') : null;

                    $user->phone = (! Helpers::IsNullOrEmpty($request->input('phone'))) ? $request->input('phone') : null;
                    $user->ccs_id = (! Helpers::IsNullOrEmpty($request->input('ccs_id'))) ? $request->input('ccs_id') : null;
                    $user->work_phone = (! Helpers::IsNullOrEmpty($request->input('work_phone'))) ? $request->input('work_phone') : null;
                    $user->work_mobile = (! Helpers::IsNullOrEmpty($request->input('work_mobile'))) ? $request->input('work_mobile') : null;

                    $user->save();

                    array_push($user_array, $user);

                 }

             }

             if($type == 3) {
                foreach ($userAcc as $key => $user){
                    if (!Hash::check($request->input('current_password'), $user->password))
                    {
                        return response()->json(
                            RequestHelper::sendResponse(RequestType::CODE_400, 'Sorry. your current password does not match our records.'
                            ), RequestType::CODE_400);
                    }
                    $user->password = bcrypt($request->input('password'));
                    $user->save();

                    array_push($user_array, $user);

                 }
             }

             // send sns if branch is connected to current gen (kinder connect)
             foreach($user_array as $user) {

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
             }


             DB::commit();
             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new UserResource($userAcc[0],['profile'=>true])
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function updateImage(Request $request)
    {
        $userAcc = User::where('email','=',Auth()->user()->email)->get()->first();
        $profilepictureinput = $request->input('upload_file');

        if ($profilepictureinput) {
            $userAcc->image = $profilepictureinput['staffImage'][0];
            $userAcc->save();
        }

        // send sns if branch is connected to current gen (kinder connect)
        if($userAcc->branch->kinderconnect)
        {
            $this->snsService->publishEvent(
                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                [
                    'organization' => $userAcc->organization_id,
                    'branch' => $userAcc->branch_id,
                    'subjectid' => $userAcc->id,
                    'role' => $userAcc->getRoleTypeForKinderConnect(),
                    'action' => CurrentGenConnectType::ACTION_UPDATE
                ],
                CurrentGenConnectType::USER_SUBJECT
            );
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update'),
                new UserResource($userAcc,['profile'=>true])
            ), RequestType::CODE_200);
    }

    public function deleteImage(Request $request)
    {
        $id = Helpers::decodeHashedID($request->input('reference'));
        $userAcc = User::where('id','=',$id)->get()->first();

        $userAcc->image = null;
        $userAcc->save();

        // send sns if branch is connected to current gen (kinder connect)
        if($userAcc->branch->kinderconnect)
        {
            $this->snsService->publishEvent(
                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                [
                    'organization' => $userAcc->organization_id,
                    'branch' => $userAcc->branch_id,
                    'subjectid' => $userAcc->id,
                    'role' => $userAcc->getRoleTypeForKinderConnect(),
                    'action' => CurrentGenConnectType::ACTION_UPDATE
                ],
                CurrentGenConnectType::USER_SUBJECT
            );
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update'),
                new UserResource($userAcc)
            ), RequestType::CODE_200);
    }

    public function emailNotifications(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'enquiry' => ['required'],
            'waitlist' => ['required'],
            'enrolment' => ['required'],
        ]);


        if ($validator->fails()) {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    LocalizationHelper::getTranslatedText('system.missing_parameters')
                ),
                RequestType::CODE_400
            );
        }

        $userObj = User::find(auth()->user()->id);

        if (is_null($userObj)) {
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
        }

        if (!((!is_null($userObj->branch_id) && $userObj->site_manager == 0) || is_null($userObj->branch_id) && $userObj->site_manager == 1)) {
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('response.no_permission_to_role')
                ), RequestType::CODE_404);
        }


        $emailTypes = $request->all();


        foreach ($emailTypes as $emailType) {
            $types = EmailTypes::where('status', 1)->where('type', $emailType['type'])->get()->first();
            $userObj->emailTypes()->syncWithoutDetaching([$types->id => ['status' => $emailType['status']]]);
        }
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update')
            ), RequestType::CODE_200);
    }
}
