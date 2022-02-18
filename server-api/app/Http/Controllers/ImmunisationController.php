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
use Kinderm8\ChildDocuments;
use Kinderm8\CcsSetup;
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
use Kinderm8\Repositories\Immunisation\IImmunisationRepository;
use Kinderm8\Http\Resources\ImmunisationResource;
use Kinderm8\Http\Resources\ImmunisationResourceCollection;
use Kinderm8\Http\Resources\ImmunisationTrackingResourceCollection;
use Kinderm8\Http\Resources\ImmunisationTrackingResource;
use Kinderm8\Http\Resources\ImmunisationScheduleResourceCollection;

class ImmunisationController extends Controller
{
    private $immunisationRepo;
    private $snsService;

    public function __construct(IImmunisationRepository $immunisationRepo, SNSContract $snsService)
    {
        $this->immunisationRepo = $immunisationRepo;
        $this->snsService = $snsService;
    }


    public function get(Request $request)
    {
        $data = $this->immunisationRepo->list([], $request);

        return (new ImmunisationResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getAll(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->get(
                ['status'=>'1'],
                ['creator','branch','schedule'],
                $request,
                false
            );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new ImmunisationResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $immunisation = $this->immunisationRepo->store($request, 'ImmunisationSchedule', 'Branch');

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


    public function updateStatus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $immunisation = $this->immunisationRepo->updateStatus(Helpers::decodeHashedID($request->input('id')), $request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ImmunisationResource($immunisation)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $immunisation = $this->immunisationRepo->update(Helpers::decodeHashedID($request->input('id')), $request, 'ImmunisationSchedule');

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ImmunisationResource($immunisation)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
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
            $this->immunisationRepo->delete(Helpers::decodeHashedID($request->input('id')));

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

    public function getTracker(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->getTracker([], $request, 'ImmunisationTracking');
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
        return (new ImmunisationTrackingResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }


    public function getAllTracker(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->getAllTracker([], $request, 'ImmunisationTracking');
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
        return (new ImmunisationTrackingResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function createSingleTracker(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->storeSingleTracker( $request, 'ImmunisationTracking');

             // reload with relations
             $data->load(['creator', 'immunisation', 'schedule', 'branch','child']);

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new ImmunisationTrackingResource($data)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
    }



    public function updateSingleTracker(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->updateSingleTracker( $request, 'ImmunisationTracking');

             // reload with relations
             $data->load(['creator', 'immunisation', 'schedule', 'branch','child']);

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ImmunisationTrackingResource($data)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
    }

    public function updateBulkTrackerByChild(Request $request)
    {
        $data = [];

        DB::beginTransaction();
        try
        {
            $data = $this->immunisationRepo->updatebulkTrackerByChild( $request, 'ImmunisationTracking');
            $trackingData =  $this->immunisationRepo->getAllTracker([], $request, 'ImmunisationTracking');

            DB::commit();

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ImmunisationTrackingResourceCollection($trackingData)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);
        }
    }

    public function updateBulkTracker(Request $request)
    {
        $data = [];

        DB::beginTransaction();
        try
        {
            $data = $this->immunisationRepo->updatebulkTracker( $request, 'ImmunisationTracking');
            $trackingData =  $this->immunisationRepo->getAllTracker([], $request, 'ImmunisationTracking');

            DB::commit();

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new ImmunisationTrackingResourceCollection($trackingData)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);
        }
    }

    public function deleteBulkTrackerByChild(Request $request)
    {
        $data = [];

        DB::beginTransaction();
        try
        {
            $data = $this->immunisationRepo->deleteBulkTrackerByChild( $request, 'ImmunisationTracking');
            $trackingData =  $this->immunisationRepo->getAllTracker([], $request, 'ImmunisationTracking');

            DB::commit();

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete'),
                    new ImmunisationTrackingResourceCollection($trackingData)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);
        }
    }

    public function deleteTracker(Request $request)
    {
        $data = [];

        DB::beginTransaction();
        try
        {
            $data = $this->immunisationRepo->deleteTrackerByID( $request, 'ImmunisationTracking');

            DB::commit();

             return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete'),
                    new ImmunisationTrackingResource($data)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);
        }
    }

    public function import(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $immunisation = $this->immunisationRepo->import($request,'ImmunisationSchedule', 'Organization');

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



    public function getAllSchedule(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->immunisationRepo->getAllSchedule();
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
        return (new ImmunisationScheduleResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }
}
