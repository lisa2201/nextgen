<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\StaffIncident;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Controllers\Controller;
//use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\StaffIncidentResource;
use Kinderm8\Http\Resources\StaffIncidentResourceCollection;
use Kinderm8\Repositories\StaffIncident\IStaffIncidentRepository;
use LocalizationHelper;
use RequestHelper;
use Log;

class StaffIncidentController extends Controller
{
    private $staffIncidentRepo;

    public function __construct(IStaffIncidentRepository $staffIncidentRepo)
    {
        $this->staffIncidentRepo = $staffIncidentRepo;
    }

    public function getIncident(Request $request)
    {
        $data = $this->staffIncidentRepo->getIncident($request);

        return (new StaffIncidentResource($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function get(Request $request)
    {
        $data = $this->staffIncidentRepo->list($request);

        return (new StaffIncidentResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['list'],
                'displayRecord' =>$data['list'],
                'filtered' => $data['list']
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->staffIncidentRepo->store($request);

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

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $rowObj = $this->staffIncidentRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            if($rowObj){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_update')
                    ), RequestType::CODE_200);

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    LocalizationHelper::getTranslatedText('response.resource_not_found')
                ), RequestType::CODE_400);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function delete(Request $request)
    {
        DB::beginTransaction();
        try
        {
            $room = $this->staffIncidentRepo->delete(Helpers::decodeHashedID($request->input('id')));

            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete'),
                    ['totalRecords' => $room]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }


   public function deviceGetIncidentList(Request $request)
   {
       try
       {
            $data = $this->staffIncidentRepo->list($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    new StaffIncidentResourceCollection($data['list'])
                ), RequestType::CODE_200);

       }
       catch (Exception $e)
       {
           throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
       }
   }

}
