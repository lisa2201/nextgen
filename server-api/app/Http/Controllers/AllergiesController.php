<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Allergy;
use Kinderm8\Branch;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\AllergyResourceCollection;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Repositories\AllergyTypes\IAllergyTypesRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use RequestHelper;
use Log;
use PathHelper;
use DB;

class AllergiesController extends Controller
{

    private $snsService;
    private $allergyTypeRepo;

    public function __construct(SNSContract $snsService, IAllergyTypesRepository $allergyTypesRepo)
    {
        $this->snsService = $snsService;
        $this->allergyTypeRepo = $allergyTypesRepo;
    }

    /**
     * get booking request list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {

        $actualCount = 0;

        try {
            $child_id = Helpers::decodeHashedID($request->input('child_id'));

            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            $allergy_details = Allergy::where('child_id', '=', $child_id);

            //search
            if (!is_null($searchValue)) {

                $allergy_details->whereLike(['allergy_type'], $searchValue);
            }

            //get actual count
            $actualCount = $allergy_details->get()->count();


            $allergy_details = $allergy_details->paginate($offset);
        } catch (Exception $e) {
            ErrorHandler::log($e);

            $allergy_details = [];
        }


        return (new AllergyResourceCollection($allergy_details))
            ->additional([
                'totalRecords' => $actualCount,
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function store(Request $request)
    {

        DB::beginTransaction();

        try {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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

            $allergyData =  new Allergy();
            $allergyData->child_id =  Helpers::decodeHashedID($request->input('childId'));
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();


            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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

    public function update(Request $request){

        DB::beginTransaction();

        try {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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
            $id = Helpers::decodeHashedID($request->input('id'));

            $allergyData = Allergy::find($id);
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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
    public function delete(Request $request)
    {

        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));

            $user = Allergy::find($id);
            $childID = $user->child_id;

            if (is_null($user)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $user->delete();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childID ,
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );
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

    public function getAllergyTypes(Request $request)
    {
        if($request->input('branch_id') || auth()->user()->branch_id)
        {
            $branch_id = ($request->input('branch_id')) ? Helpers::decodeHashedID($request->input('branch_id')) : auth()->user()->branch_id;
            $organization = (isset(auth()->user()->site_manager) && auth()->user()->hasOwnerAccess() && $request->input('branch_id') == '') ? auth()->user()->organization_id : Branch::find($branch_id)->organization_id;

            $data = $this->allergyTypeRepo->get([],
                [],
                $request,
                false,
                $organization);
        }
        else
        {
            $data = $this->allergyTypeRepo->get([],
                [ ],
                $request,
                false);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_request'),
                $data
            ), RequestType::CODE_201);
    }


    public function getAllergyTypesParent(Request $request)
    {
        if($request->input('branch_id') || auth()->user()->branch_id)
        {
            $branch_id = ($request->input('branch_id')) ? Helpers::decodeHashedID($request->input('branch_id')) : auth()->user()->branch_id;
            $organization = (isset(auth()->user()->site_manager) && auth()->user()->hasOwnerAccess() && $request->input('branch_id') == '') ? auth()->user()->organization_id : Branch::find($branch_id)->organization_id;

            $data = $this->allergyTypeRepo->get([],
                [],
                $request,
                false,
                $organization);
        }
        else
        {
            $data = $this->allergyTypeRepo->get([],
                [ ],
                $request,
                false);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_request'),
                $data
            ), RequestType::CODE_201);
    }


    public function deviceGetAllergyTypesParent(Request $request)
    {
        if($request->input('branch_id') || auth()->user()->branch_id)
        {
            $branch_id = ($request->input('branch_id')) ? Helpers::decodeHashedID($request->input('branch_id')) : auth()->user()->branch_id;
            $organization = (isset(auth()->user()->site_manager) && auth()->user()->hasOwnerAccess() && $request->input('branch_id') == '') ? auth()->user()->organization_id : Branch::find($branch_id)->organization_id;

            $data = $this->allergyTypeRepo->get([],
                [],
                $request,
                false,
                $organization);
        }
        else
        {
            $data = $this->allergyTypeRepo->get([],
                [ ],
                $request,
                false);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_request'),
                $data
            ), RequestType::CODE_201);
    }

    public function storeParent(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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

            $allergyData =  new Allergy();
            $allergyData->child_id =  Helpers::decodeHashedID($request->input('childId'));
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();


            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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


    public function deviceStoreParent(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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

            $allergyData =  new Allergy();
            $allergyData->child_id =  Helpers::decodeHashedID($request->input('childId'));
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();


            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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

    public function updateParent(Request $request){

        DB::beginTransaction();

        try {
            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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
            $id = Helpers::decodeHashedID($request->input('id'));

            $allergyData = Allergy::find($id);
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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

    public function deviceUpdateParent(Request $request){

        DB::beginTransaction();

        try {
            $validator = Validator::make($request->all(), [
                'allergyType' => ['required'],
                'description' => ['required'],
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
            $id = Helpers::decodeHashedID($request->input('id'));

            $allergyData = Allergy::find($id);
            $allergyData->allergy_type = Helpers::decodeHashedID($request->input('allergyType'));
            $allergyData->description = $request->input('description');

            $allergyData->save();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $allergyData->child_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {

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


    public function deleteParent(Request $request)
    {

        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            \Log::info($id);

            $user = Allergy::find($id);
            Log::info($user);

            $childID = $user->child_id;

            if (is_null($user)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $user->delete();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childID ,
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );
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

    public function deviceDeleteParent(Request $request)
    {

        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            \Log::info($id);

            $user = Allergy::find($id);
            Log::info($user);

            $childID = $user->child_id;

            if (is_null($user)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $user->delete();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childID ,
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );
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
