<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\PaymentTermsDeleteRequest;
use Kinderm8\Http\Requests\PaymentTermsStoreRequest;
use Kinderm8\Http\Requests\PaymentTermsUpdateRequest;
use Kinderm8\Http\Requests\PaymentTermsUpdateStatusRequest;
use Kinderm8\Http\Resources\PaymentTermResourceCollection;
use Kinderm8\Repositories\PaymentTerms\IPaymentTermsRepository;
use LocalizationHelper;
use RequestHelper;

class PaymentTermsController extends Controller
{


    private $paymentTermRepo;

    public function __construct(IPaymentTermsRepository $paymentTermRepo)
    {
        $this->paymentTermRepo = $paymentTermRepo;
    }

    public function list(Request $request)
    {

        try {

            $data = $this->paymentTermRepo->list($request, []);

            return (new PaymentTermResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['totalRecords'],
                'filtered' => !is_null($data['filtered'])
            ])
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
            app(PaymentTermsStoreRequest::class);

            $paymentTerm = $this->paymentTermRepo->store($request);

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
            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }

    public function update(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(PaymentTermsUpdateRequest::class);

            $paymentTerm = $this->paymentTermRepo->update($request);

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
            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }

    public function updateStatus(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(PaymentTermsUpdateStatusRequest::class);

            $paymentTerm = $this->paymentTermRepo->updateStatus($request);

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
            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }

    public function delete(Request $request)
    {

        try {

            // validation
            app(PaymentTermsDeleteRequest::class);

            $this->paymentTermRepo->delete(Helpers::decodeHashedID($request->input('id')));

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
