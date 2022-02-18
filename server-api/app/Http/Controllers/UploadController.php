<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use LocalizationHelper;
use Log;
use RequestHelper;

class UploadController extends Controller
{
    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadDocs(Request $request)
    {
        try
        {
            Log::error($request->all());

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request')
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

}
