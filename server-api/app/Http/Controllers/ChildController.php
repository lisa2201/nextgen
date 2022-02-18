<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Child;
use Kinderm8\ChildConsents;
use Kinderm8\ChildDocuments;
use Kinderm8\CcsSetup;
use Kinderm8\ChildSchoolBus;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ChildStoreRequest;
use Kinderm8\Http\Requests\ChildUpdateRequest;
use Kinderm8\Http\Resources\ChildDocumentsResource;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use RequestHelper;

class ChildController extends Controller
{
    private $childRepo;
    private $snsService;

    public function __construct(IChildRepository $childRepo, SNSContract $snsService)
    {
        $this->childRepo = $childRepo;
        $this->snsService = $snsService;
    }

    /**
     * get all children
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->childRepo->get(
                [],
                [],
                $request,
                false
            );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new ChildResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * get children list
     * @param Request $request
     * @return mixed
     */
    public function list(Request $request)
    {
        $data = $this->childRepo->list([], $request);

        $ccsEnabled = CcsSetup::where('organization_id', auth()->user()->organization->id)->get()->first();


        return (new ChildResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
                'ccsEnabled' => $ccsEnabled
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * Get child related data
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'ccs_status' => CCSType::CCS_STATUS_MAP
                    ]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * store child object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(ChildStoreRequest::class);

            // create child profile
            $childAcc = $this->childRepo->store($request);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childAcc->id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            // reload with relations
            $childAcc->load(['creator']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $childAcc->index
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
     * get child object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->childRepo->findById(
                Helpers::decodeHashedID($request->input('index')),
                ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents', 'notes', 'school_bus', 'consents']
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get child documents
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDocuments(Request $request)
    {
        try
        {
            if($request->input('child_id')) {

                $child_id = Helpers::decodeHashedID($request->input('child_id'));

                $documentData = ChildDocuments::where('child_id', '=', $child_id)->get()->first();

                return (new ChildDocumentsResource($documentData))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

            }
            else{

                $documentData = [];
                return (new ChildDocumentsResource($documentData))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
            }

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * update child documents
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function updateDocuments(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $childAcc = Child::find(Helpers::decodeHashedID($request->input('childId')));

            if($request->input('documentID'))
            {
                $ChildDocument = ChildDocuments::find(Helpers::decodeHashedID($request->input('documentID')));
                $ChildDocument->documents = $request->input('upload_files');
                $ChildDocument->save();
            }
            else
            {
                $ChildDocument = new ChildDocuments();
                $ChildDocument->child_id = $childAcc->id;
                $ChildDocument->documents = $request->input('upload_files');
                $ChildDocument->save();
            }

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
                //\Log::info("branch connected to current gen. child update sns sent child id => ".$childAcc->id);
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

    /**
     * update child object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(ChildUpdateRequest::class);

            // check item exists
            $childAcc = $this->childRepo->update(
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

    /**
     * add bus for child
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function addBusForChild(Request $request)
    {
        $childId = Helpers::decodeHashedID($request->input('child'));
        $roomId = Helpers::decodeHashedID($request->input('room'));
        $busId = Helpers::decodeHashedID($request->input('bus'));
        $schoolId = Helpers::decodeHashedID($request->input('school'));

        $schoolChaged = $request->input('school_changed');

        /* if the school of the child was changed, remove the current bus assignments.*/
        if($schoolChaged == true)
        {
            ChildSchoolBus::where('child_id', $childId)->delete();
        }

        $childSchoolBus = ChildSchoolBus::where('child_id', $childId)->where('room_id', $roomId)->where('bus_id', $busId)->where('school_id', $schoolId)->get()->first();

        if($childSchoolBus)
        {
            $child = $this->childRepo->findById($childId, ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents' , 'school_bus']);
            return ['data' => new ChildResource($child), 'message'=> 'This record already exists!'];
        }
        else{
            $newchildSchoolBus = new ChildSchoolBus();
            $newchildSchoolBus->child_id = $childId;
            $newchildSchoolBus->room_id = $roomId;
            $newchildSchoolBus->bus_id = $busId;
            $newchildSchoolBus->school_id = $schoolId;
            $newchildSchoolBus->save();
            $child = $this->childRepo->findById($childId, ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents' , 'school_bus']);
        }


        return ['data' => new ChildResource($child), 'message' => 'Record was added successfully'];
    }

    /**
     * delete bus from child
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function deleteBusFromChild(Request $request)
    {
        $childId = Helpers::decodeHashedID($request->input('child'));
        $childSchoolBusId = Helpers::decodeHashedID($request->input('id'));

       $childSchoolBus = ChildSchoolBus::where('id', $childSchoolBusId)->get()->first();

        if($childSchoolBus)
        {
            $childSchoolBus->delete();
            $child = $this->childRepo->findById($childId, ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents' , 'school_bus']);
            return ['data' => new ChildResource($child), 'message'=> 'Record was deleted successfully'];
        }
        else
        {
            $child = $this->childRepo->findById($childId, ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents' , 'school_bus']);
            return ['data' => new ChildResource($child), 'message'=> 'Record Cannot be found!'];
        }
    }

    /**
     * Delete user object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->childRepo->delete(Helpers::decodeHashedID($request->input('id')));

            $childID = Helpers::decodeHashedID($request->input('id'));

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childID,
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
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * add/remove user to child (parent type)
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function updateUser(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $user_type = (! Helpers::IsNullOrEmpty($request->input('usertype'))) ? $request->input('usertype') : '';

            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;

            $child_id = Helpers::decodeHashedID($request->input('child'));

            if($user_type == 'emergency_contact') {

                $childObj = $this->childRepo->updateEmergencyContact($child_id, $request, $type, 'User', 'ChildEmergencyContact');

                // send sns if branch is connected to current gen (kinder connect)
                if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                            'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                            'subjectid' =>  $child_id,
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                }

            }else {

                $childObj = $this->childRepo->updateUsers($child_id, $request, $type);

                // send sns if branch is connected to current gen (kinder connect)
                if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                        [
                            'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                            'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                            'subjectid' =>  $childObj->id,
                            'action' => CurrentGenConnectType::ACTION_UPDATE
                        ],
                        CurrentGenConnectType::CHILD_SUBJECT
                    );
                }
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText(($type === RequestType::ACTION_TYPE_NEW) ? 'response.success_update' : 'response.success_delete'),
                    new ChildResource($childObj)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * add/remove child room
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function updateRoom(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;

            $childObj = $this->childRepo->updateRooms(Helpers::decodeHashedID($request->input('child')), $request, $type);

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $childObj->id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText(($type === RequestType::ACTION_TYPE_NEW) ? 'response.success_update' : 'response.success_delete'),
                    new ChildResource($childObj)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function setPrimaryPayer(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $id = Helpers::decodeHashedID($request->input('child'));
            $user_id = Helpers::decodeHashedID($request->input('user'));

            $childObj = $this->childRepo->setPrimaryPayer($id, $user_id);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildResource($childObj)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceUpdateDocumentsParent(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $childAcc = Child::find(Helpers::decodeHashedID($request->input('childId')));

            if($request->input('documentID'))
            {
                $ChildDocument = ChildDocuments::find(Helpers::decodeHashedID($request->input('documentID')));
                $ChildDocument->documents = $request->input('upload_files');
                $ChildDocument->save();
            }
            else
            {
                $ChildDocument = new ChildDocuments();
                $ChildDocument->child_id = $childAcc->id;
                $ChildDocument->documents = $request->input('upload_files');
                $ChildDocument->save();
            }

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
                //\Log::info("branch connected to current gen. child update sns sent child id => ".$childAcc->id);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ChildDocumentsResource($ChildDocument)
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

    public function deviceGetDocuments(Request $request)
    {
        try
        {
            if($request->input('child_id')) {

                $child_id = Helpers::decodeHashedID($request->input('child_id'));

                $documentData = ChildDocuments::where('child_id', '=', $child_id)->get()->first();

                return (new ChildDocumentsResource($documentData))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

            }
            else{

                $documentData = [];
                return (new ChildDocumentsResource($documentData))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
            }

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function updateTrackingValue(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $id = Helpers::decodeHashedID($request->input('id'));
            $this->childRepo->updateTrackingValue($id);

            $childAcc = $this->childRepo->findById(
                $id,
                ['rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'documents' , 'school_bus']
            );

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

    public function findByBranch(Request $request)
    {
        $data = $this->childRepo->findByBranch(Helpers::decodeHashedID($request->input('index')), [], []);

        return (new ChildResourceCollection($data,['basic' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function sendBulkSNS(Request $request)
    {
        $data = $this->childRepo->findByBranch(Helpers::decodeHashedID($request->input('index')), [], []);

        foreach($data as $child){

            $childAcc = $this->childRepo->findById(
                Helpers::decodeHashedID($child->index),
                ['branch', 'organization']
            );

            if($childAcc->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => $childAcc->organization_id,
                        'branch' => $childAcc->branch_id,
                        'subjectid' =>  $childAcc->id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            sleep(2);

        }
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update')
            ), RequestType::CODE_200);
    }

    public function findByIdShort(Request $request)
    {
        try
        {
            $rowObj = $this->childRepo->findById(
                Helpers::decodeHashedID($request->input('index')),
                []
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResource($rowObj,['short'=> true])
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function updateConsents(Request $request)
    {

        DB::beginTransaction();

        try {
            if (isset($request->consents)) {

                foreach ($request->consents as $consent) {

                    $childConsent = ChildConsents::find(Helpers::decodeHashedID($consent['consent_id']));

                    if (!$childConsent->get()->isEmpty()) {
                        $childConsent->answer = $consent['answer'];
                        $childConsent->updated_by = auth()->user()->id;
                        $childConsent->save();
                    }
                }

                DB::commit();

                $childAcc = Child::find($childConsent->child_id);

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_update'),
                        new ChildResource($childAcc)
                    ), RequestType::CODE_200);
            }
        } catch (Exception $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) {
                throw new ValidationException($e->validator);
            }
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
