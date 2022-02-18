<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ParentPaymentScheduleDeleteRequest;
use Kinderm8\Http\Requests\ParentPaymentScheduleListRequest;
use Kinderm8\Http\Requests\ParentPaymentScheduleStoreRequest;
use Kinderm8\Http\Requests\ParentPaymentScheduleUpdateRequest;
use Kinderm8\Http\Resources\ParentPayementScheduleResourceCollection;
use Kinderm8\Repositories\ParentPaymentSchedule\IParentPaymentScheduleRepository;
use LocalizationHelper;
use Log;
use RequestHelper;

class ParentPaymentScheduleController extends Controller
{


    private $paymentScheduleRepo;

    public function __construct(IParentPaymentScheduleRepository $paymentScheduleRepo)
    {
        $this->paymentScheduleRepo = $paymentScheduleRepo;
    }

    public function list(Request $request)
    {

        try {

            // validation
            app(ParentPaymentScheduleListRequest::class);

            $data = $this->paymentScheduleRepo->list($request, []);

            return (new ParentPayementScheduleResourceCollection($data))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {

            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }

    }

    public function create(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(ParentPaymentScheduleStoreRequest::class);

            $schedule = $this->paymentScheduleRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );


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

    public function update(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(ParentPaymentScheduleUpdateRequest::class);

            $schedule = $this->paymentScheduleRepo->update($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );

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

        try {

            // validation
            app(ParentPaymentScheduleDeleteRequest::class);

            $this->paymentScheduleRepo->delete(Helpers::decodeHashedID($request->input('id')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }


}
