<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Addon;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\AddonResourceCollection;
use Kinderm8\Http\Resources\AddonResource;
use RequestHelper;
use Helpers;
use LocalizationHelper;
use Log;

class AddonController extends Controller
{
    /**
     * Addon List
     * @return JsonResponse
     */
    public function index(Request $request)
    {
        $addons = [];

        try
        {
            $addons = Addon::where('status', '0')
                ->where('plugin', '0')->get();
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new AddonResourceCollection($addons))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * Addon Info
     */
    public function show(Request $request)
    {
        $addonId = $request->input('id');

        if (empty($addonId))
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    LocalizationHelper::getTranslatedText('system.missing_parameters')
                ),
                RequestType::CODE_400
            );
        }

        try
        {
            $aid = null;
            $aid = Helpers::decodeHashedID($addonId);

            $addon = Addon::find($aid);

            if (is_null($addon))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ), RequestType::CODE_404);
            }

            return (new AddonResource($addon))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
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
