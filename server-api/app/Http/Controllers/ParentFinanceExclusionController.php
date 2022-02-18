<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use RequestHelper;
use Helpers;
use Illuminate\Validation\ValidationException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ParentFinanceExclusionDeleteRequest;
use Kinderm8\Http\Requests\ParentFinanceExclusionListRequest;
use Kinderm8\Http\Requests\ParentFinanceExclusionStoreRequest;
use Kinderm8\Http\Resources\ParentFinanceExclusionResourceCollection;
use Kinderm8\Repositories\ParentFinanceExclusion\IParentFinanceExclusionRepository;
use LocalizationHelper;

class ParentFinanceExclusionController extends Controller
{
    private $parentFinanceExcusionRepo;

    public function __construct(IParentFinanceExclusionRepository $parentFinanceExcusionRepo)
    {
        $this->parentFinanceExcusionRepo = $parentFinanceExcusionRepo;
    }

    public function list(Request $request)
    {

        try {

            // validation
            app(ParentFinanceExclusionListRequest::class);

            $exclusions = $this->parentFinanceExcusionRepo->list($request, []);

            return (new ParentFinanceExclusionResourceCollection($exclusions, []))
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

        try {

            // validation
            app(ParentFinanceExclusionStoreRequest::class);

            $exclusion = $this->parentFinanceExcusionRepo->store($request);

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
            app(ParentFinanceExclusionDeleteRequest::class);

            $this->parentFinanceExcusionRepo->delete(Helpers::decodeHashedID($request->input('id')));

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
