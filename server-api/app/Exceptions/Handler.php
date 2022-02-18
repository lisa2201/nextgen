<?php

namespace Kinderm8\Exceptions;

use ErrorException;
use ErrorHandler;
use Exception;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Foundation\Http\Exceptions\MaintenanceModeException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Laravel\Passport\Exceptions\OAuthServerException;
use League\OAuth2\Server\Exception\OAuthServerException as OAuthError;
use LocalizationHelper;
use RequestHelper;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array
     */
    protected $dontReport = [
        AuthenticationException::class,
        AuthorizationException::class,
        HttpException::class,
        ModelNotFoundException::class,
        TokenMismatchException::class,
        ValidationException::class,
        OAuthServerException::class,
        OAuthError::class
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array
     */
    protected $dontFlash = [
        'password',
        'password_confirmation',
    ];

    /**
     * Report or log an exception.
     *
     * @param Exception $exception
     * @return void
     * @throws Exception
     */
    public function report(Exception $exception)
    {
        if ($this->shouldReport($exception))
        {
            //$this->sendEmail($exception); // sends an email
            ErrorHandler::log($exception);
        }

        /*if (!$exception instanceof ServerErrorException)
        {
            parent::report($exception);
        }*/
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param Request $request
     * @param Exception $exception
     * @return Response|\Symfony\Component\HttpFoundation\Response
     * @throws Exception
     */
    public function render($request, Exception $exception)
    {
        /**
         * ---- common errors ---
         */
        if ($exception instanceof ServerErrorException)
        {
            if($exception->getCode() === ErrorType::NotFound)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ), RequestType::CODE_404);
            }
            else if($exception->getCode() === ErrorType::CustomValidationErrorCode)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        $exception->getMessage()
                    ), RequestType::CODE_400);
            }
            else
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        LocalizationHelper::getTranslatedText('system.internal_error')
                    ), RequestType::CODE_500);
            }
        }
        else if($exception instanceof ErrorException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
        else if($exception instanceof ValidationException)
        {
            \Log::debug('ValidationException: ' . json_encode($exception->errors()));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    LocalizationHelper::getTranslatedText('validation.invalid_inputs'),
                    $exception->validator
                ), RequestType::CODE_400);
        }
        else if ($exception instanceof NotFoundHttpException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
        else if ($exception instanceof ModelNotFoundException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
        else if ($exception instanceof RequestException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.api_failed')
                ), RequestType::CODE_500);
        }
        else if($exception instanceof MaintenanceModeException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_503,
                    LocalizationHelper::getTranslatedText('system.on_maintenance')
                ), RequestType::CODE_503);
        }
        else if($exception instanceof ThrottleRequestsException)
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_429,
                    $exception->getMessage()
                ), RequestType::CODE_429);
        }

        return parent::render($request, $exception);
    }
}
