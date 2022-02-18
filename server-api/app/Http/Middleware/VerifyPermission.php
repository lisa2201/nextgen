<?php

namespace Kinderm8\Http\Middleware;

use Closure;
use Exception;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use LocalizationHelper;
use RequestHelper;

class VerifyPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Request  $request
     * @param Closure $next
     * @return mixed
     */
    public function handle($request, Closure $next, $permission)
    {
        try
        {
            if (! auth()->user()->hasAnyDirectPermission(explode('|', $permission)))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_401,
                        LocalizationHelper::getTranslatedText('auth.unauthorized_user')
                ), RequestType::CODE_403);
            }
        }
        catch (Exception $e)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_401,
                    LocalizationHelper::getTranslatedText('auth.unauthorized_user')
            ), RequestType::CODE_401);
        }

        return $next($request);
    }
}
