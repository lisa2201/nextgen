<?php

namespace Kinderm8\Http\Middleware;

use Closure;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\AuthClientType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Traits\PassportClient;
use Laminas\Diactoros\StreamFactory;
use Laminas\Diactoros\ResponseFactory;
use Laminas\Diactoros\UploadedFileFactory;
use Laminas\Diactoros\ServerRequestFactory;
use Laravel\Passport\Http\Middleware\CheckCredentials;
use League\OAuth2\Server\Exception\OAuthServerException;
use LocalizationHelper;
use Log;
use RequestHelper;
use Symfony\Bridge\PsrHttpMessage\Factory\PsrHttpFactory;

class CheckClientCredentials extends CheckCredentials
{
    use PassportClient;

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @param mixed ...$scopes
     * @return JsonResponse|mixed
     */
    public function handle($request, Closure $next, ...$scopes)
    {
        $psr = (new PsrHttpFactory(
            new ServerRequestFactory,
            new StreamFactory,
            new UploadedFileFactory,
            new ResponseFactory
        ))->createRequest($request);

        try
        {
            $check = $this->server->validateAuthenticatedRequest($psr);
        }
        catch (OAuthServerException $e)
        {
            Log::debug('/* --------- check token expiry ------------ */');

            try
            {
                // get auth type : web or mobile
                $type = (! Helpers::IsNullOrEmpty($request->header('auth-client'))) ? $request->header('auth-client') : AuthClientType::MOBILE_LOGIN;

                // check refresh token for web requests
                if ($type === AuthClientType::WEB_LOGIN)
                {
                    // check if refresh token exists
                    if (Helpers::IsNullOrEmpty($request->header('refresh-token')))
                    {
                        return response()->json(
                            RequestHelper::sendResponse(
                                RequestType::CODE_401,
                                LocalizationHelper::getTranslatedText('auth.refresh_token_missing')
                        ), RequestType::CODE_401);
                    }

                    // get response data
                    $data = $this->refreshTokenRequest($request, $psr);

                    // token refreshed and continue.
                    if($data['code'] === 200)
                    {
                        // authenticate user
                        $this->authorizeUser($request, $data['response']['access_token']);

                        // send the refreshed token back to the client
                        $response = $next($request);

                        $response->headers->set('Authorization', 'Bearer ' . $data['response']['access_token']);
                        $response->headers->set('Refresh-Token', $data['response']['refresh_token']);

                        return $response;
                    }
                    // token cant not be refreshable
                    else
                    {
                        Log::debug('refresh token expired', $data);

                        return response()->json(
                            RequestHelper::sendResponse(
                                RequestType::CODE_401,
                                LocalizationHelper::getTranslatedText('auth.token_expired')
                        ), RequestType::CODE_401);
                    }
                }
                // personal access token expired
                else
                {
                    Log::debug('failed to refresh mobile access token');

                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_401,
                            LocalizationHelper::getTranslatedText('auth.token_expired')
                    ), RequestType::CODE_401);
                }
            }
            catch (Exception $e)
            {
                ErrorHandler::log($e);

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_401,
                        LocalizationHelper::getTranslatedText('system.token_invalid')
                ), RequestType::CODE_401);
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_401,
                    LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_401);
        }

        return $next($request);
    }

    protected function validateCredentials($token) {}

    protected function validateScopes($token, $scopes) {}
}
