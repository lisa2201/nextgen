<?php

namespace Kinderm8\Http\Controllers;

use Branca\Branca;
use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AuthClientType;
use Kinderm8\Enums\AuthLogType;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Events\AuthLogEventHandler;
use Kinderm8\Exceptions\Passport\AuthException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ForgotPasswordRequest;
use Kinderm8\Http\Requests\KinderConnectLoginRequest;
use Kinderm8\Http\Requests\KinderPayAccessRequest;
use Kinderm8\Http\Requests\KinderPayLoginRequest;
use Kinderm8\Http\Requests\LoginRequest;
use Kinderm8\Http\Requests\PincodeLoginRequest;
use Kinderm8\Http\Requests\PincodeLoginRequestStaff;
use Kinderm8\Http\Requests\QRLoginRequest;
use Kinderm8\Http\Requests\UserIdLoginRequest;
use Kinderm8\Http\Requests\ResetPasswordRequest;
use Kinderm8\Http\Requests\UserResetPasswordRequest;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Notifications\PasswordResetNotification;
use Kinderm8\Notifications\SendResetPasswordMail;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\AuthChecker;
use Kinderm8\Traits\PassportClient;
use Kinderm8\Traits\Password;
use Kinderm8\Traits\SNSActions;
use Laravel\Passport\RefreshToken;
use LocalizationHelper;
use PathHelper;
use RequestHelper;

class PassportController extends Controller
{
    use AuthChecker,
        PassportClient,
        Password,
        SNSActions;

    private $userRepo;
    private $childRepo;
    private $simpleTokeKey;
    private $simpleTokeExpiry;
    private $snsService;

    /**
     * Create a new AuthController instance.
     *
     * @param IUserRepository $userRepo
     * @param IChildRepository $childRepo
     * @param SNSContract $snsService
     */
    public function __construct(IUserRepository $userRepo, IChildRepository $childRepo, SNSContract $snsService)
    {
        $this->userRepo = $userRepo;
        $this->childRepo = $childRepo;
        $this->simpleTokeKey = config('simple-token.secret');
        $this->simpleTokeExpiry = config('simple-token.ttl');
        $this->snsService = $snsService;
    }

    /**
     * passport oauth user login
     *
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function login(Request $request)
    {
        try
        {
            // validation
            app(LoginRequest::class);

            // get auth type [web/mobile]
            $type = (! Helpers::IsNullOrEmpty($request->header('auth-client'))) ? $request->header('auth-client') : AuthClientType::MOBILE_LOGIN;

            // get user
            $user = $this->userRepo
                ->with(['organization', 'branch', 'roles'])
                ->where('email', trim($request->input('email')));

            // if user has branch
            $user->when(!is_null(RequestHelper::getBranchId()), function($query)
            {
                return $query->where('branch_id', RequestHelper::getBranchId());
            },
            function ($query)
            {
                return $query->whereNull('branch_id');
            });

            // get user
            $user = $user->first();

            // check authorization validation
            $this->loginValidatorRules($user, $request);

            // validate user accessibility
            $this->validateUser($user, RequestHelper::getBranchId());

            // generate tokens
            if ($type === AuthClientType::WEB_LOGIN)
            {
                $data = $this->loginRequest($user, $request);

                if (is_null($data))
                {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            LocalizationHelper::getTranslatedText('system.request_forbidden')
                    ), RequestType::CODE_400);
                }

                $send_response = [
                    'access_token' => $data['access_token'],
                    'refresh_token' => $data['refresh_token'],
                ];
            }
            else
            {
                $send_response = [
                    'access_token' => $this->loginMobileRequest($user),
                    'user' => $user
                ];
            }

            // set user type (initial redirect for parent users)
            $send_response['__iED'] = $user->isParent();

            // dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Login));

            // login successful
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $send_response
                ), RequestType::CODE_200);
        }
        catch(AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
            ), $e->getCode());
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * passport oauth user login with pincode
     *
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function devicePincodeLogin(Request $request)
    {
        try
        {
            if($request->input('type') == 'parent'){
                // validation
                app(PincodeLoginRequest::class);

                // get user
                $user = $this->userRepo->with(['organization', 'branch', 'roles','child'])->where('pincode', $request->input('pincode'))->where('phone', $request->input('phone'));

            }else if($request->input('type') == 'staff'){
                // validation
                app(PincodeLoginRequestStaff::class);

                // get user
                $user = $this->userRepo->with(['organization', 'branch', 'roles'])
                    ->where('pincode', $request->input('pincode'))
                    ->whereHas('roles', function ($query)
                        {
                            $query->where('type', RoleType::ADMINPORTAL);
                        });

            }

            // if user has branch
            if (!is_null(RequestHelper::getBranchId())) $user->where('branch_id', RequestHelper::getBranchId());

            // get user
            $user = $user->first();

            // check authorization validation
            $this->PincodeLoginValidatorRules($user, $request);

            // validate user accessibility
            $this->validatePincodeUser($user, RequestHelper::getBranchId());

            // generate tokens

            if($request->input('is_web') == true){

                $passport_data = $this->createPassportTokenByUserId($user->id);

                $send_response = [
                'access_token' => $passport_data['access_token'],
                'refresh_token' => $passport_data['refresh_token'],
                'user' => new UserResource($user)
                ];
                }
                else{
                    $send_response = [
                        'access_token' => $this->loginMobileRequest($user),
                        'user' =>  $user,
                    ];
                }


            // set user type (initial redirect for parent users)
            $send_response['__iED'] = $user->isParent();

            // dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Login));

            // login successful
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $send_response
                ), RequestType::CODE_200);
        }
        catch(AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
                ), $e->getCode());
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * passport oauth user login with pincode
     *
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function deviceQRCodeLogin(Request $request)
    {
        try
        {
            // validation
            app(QRLoginRequest::class);

            // get user
            $user = $this->userRepo->with(['organization', 'branch', 'roles'])->where('email', $request->input('email'))->where('phone', $request->input('phone'));

            // if user has branch
            if (!is_null(RequestHelper::getBranchId())) $user->where('branch_id', RequestHelper::getBranchId());

            // get user
            $user = $user->first();

            // check authorization validation
            $this->QRLoginValidatorRules($user);

            // validate user accessibility
            $this->validateUser($user, RequestHelper::getBranchId());

            // generate tokens
            $send_response = [
                'access_token' => $this->loginMobileRequest($user),
                'user' => $user
            ];

            // set user type (initial redirect for parent users)
            $send_response['__iED'] = $user->isParent();

            // dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Login));

            // login successful
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $send_response
                ), RequestType::CODE_200);
        }
        catch(AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
                ), $e->getCode());
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * passport oauth user login with user id/ from kinderconnect
     *
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function deviceUserIdLogin(Request $request)
    {
        try
        {
            // validation
           app(UserIdLoginRequest::class);
   
            // get user
            $user = $this->userRepo->with(['organization', 'branch', 'roles'])->where('id', $request->input('user_id'));

            // if user has branch
            if (!is_null(RequestHelper::getBranchId())) $user->where('branch_id', RequestHelper::getBranchId());

            // get user
            $user = $user->first();

            // check authorization validation
            $this->UserIdLoginValidatorRules($user);

            // validate user accessibility
            $this->validateUser($user, RequestHelper::getBranchId());

            // generate tokens
            $send_response = [
                'access_token' => $this->loginMobileRequest($user),
                'user' => $user
            ];

            // set user type (initial redirect for parent users)
            $send_response['__iED'] = $user->isParent();

            // dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Login));

            // login successful
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $send_response
                ), RequestType::CODE_200);
        }
        catch(AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
                ), $e->getCode());
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function kinderConnectLogin(Request $request)
    {
        try
        {
            // validation
            app(KinderConnectLoginRequest::class);

            $security = new Branca($this->simpleTokeKey);

            $token = $security->encode(json_encode([
                'email' => auth()->user()->email,
                'name' => strtolower(trim(auth()->user()->full_name))
            ]), (int) Carbon::now('UTC')->timestamp);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    PathHelper::getKinderConnectAccessPath($request->fullUrl(), $request->input('domain'), $token)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function kinderPayLogin(Request $request)
    {
        try
        {
            // validation
            app(KinderPayLoginRequest::class);

            $security = new Branca($this->simpleTokeKey);

            $data = json_decode($security->decode($request->input('token'), (int) $this->simpleTokeExpiry), true);

            // get user
            $user = $this->userRepo->findById((int) $data['id'], ['organization', 'branch', 'roles']);

            // validate user accessibility
            $this->validateUser($user, $user->branch_id);

            // get tokens
            $passport_data = $this->createPassportTokenByUserId($user->id);

            // response
            $send_response = [
                'path' => isset($data['path']) ? $data['path'] : null,
                'access_token' => $passport_data['access_token'],
                'refresh_token' => $passport_data['refresh_token']
            ];

            // set user type (initial redirect for parent users)
            $send_response['__iED'] = $user->isParent();

            // dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Login));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $send_response
                ), RequestType::CODE_200);
        }
        catch(AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
            ), $e->getCode());
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getBranchAccessLinks(Request $request)
    {
        $accounts = [];

        try
        {
            if (auth()->user()->hasOwnerAccess())
            {
                // get branch accounts
                $accounts = $this->userRepo->findBranchUserBySubscriber(
                    auth()->user()->organization_id,
                    auth()->user()->id,
                    auth()->user()->email,
                    [
                        'relation_filter' => [
                            'branch' => [
                                [
                                    'column' => 'status',
                                    'value' => '0'
                                ],
                                [
                                    'column' => 'deleted_at',
                                    'value' => null
                                ]
                            ]
                        ]
                    ],
                    [ 'branch' ],
                    false,
                    false
                );
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $accounts = [];
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                new UserResourceCollection($accounts, [ 'organization' => true ])
            ), RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function kinderPayAccess(Request $request)
    {
        try
        {
            // validation
            app(KinderPayAccessRequest::class);

            // get user
            $user = $this->userRepo->findByBranch(
                Helpers::decodeHashedID($request->input('branch')),
                [
                    'user' => Helpers::decodeHashedID($request->input('user'))
                ],
                []
            )->first();

            if (is_null($user) || is_null($user->branch))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_404);
            }

            $security = new Branca($this->simpleTokeKey);

            $token = $security->encode(json_encode([
                'email' => $user->email,
                'id' => $user->id
            ]), (int) Carbon::now('UTC')->timestamp);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    PathHelper::getBranchUrls($request->fullUrl(), $user->branch) . '/login?token=' . $token
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * logout user
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function logout()
    {
        try
        {
            $user = auth()->user();

            //delete refresh token
            RefreshToken::where('access_token_id', auth()->user()->token()->id)->delete();

            //delete access token
            auth()->user()->token()->delete();

            //dispatch events
            event(new AuthLogEventHandler($user, AuthLogType::Logout));

            unset($user);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('auth.logout_success')
            ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e);
        }
    }

    /**
     * get auth user
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getUser()
    {
        try
        {
            if (!auth()->check())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_401,
                        LocalizationHelper::getTranslatedText('auth.invalid_user')
                    ), RequestType::CODE_401);
            }

            // validate user accessibility
            $this->validateUser(auth()->user(), RequestHelper::getBranchId());

            $response = new UserResource(auth()->user(), [ 'isAuth' => true ]);

            // validate user attributes
            $this->validateUserAttributes($response);

            return $response
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (AuthException $e)
        {
            return response()->json(
                RequestHelper::sendResponse($e->getCode(), $e->getMessage()
            ), $e->getCode());
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Model|null $user
     * @param Request $request
     * @throws AuthException
     */
    protected function loginValidatorRules(?Model $user, Request $request)
    {
        if (is_null($user) || !$user->validateForPassportPasswordGrant($request->input('password')))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_credentials'), RequestType::CODE_400);
        }
    }

    /**
     * @param Model|null $user
     * @param Request $request
     * @throws AuthException
     */
    protected function PincodeLoginValidatorRules(?Model $user, Request $request)
    {
        if(is_null($user) || !($user->pincode == $request->input('pincode')))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_pincode'), RequestType::CODE_400);
        }

        if($request->input('type') == 'parent') {
            if (is_null($user) || !($user->phone == $request->input('phone'))) {
                throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_phone'), RequestType::CODE_400);
            }
        }
    }

    /**
     * @param Model|null $user
     * @param Request $request
     * @throws AuthException
     */
    protected function QRLoginValidatorRules(?Model $user)
    {
        if(is_null($user))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_qr_code'), RequestType::CODE_400);
        }
    }

    /**
     * @param Model|null $user
     * @param Request $request
     * @throws AuthException
     */
    protected function UserIdLoginValidatorRules(?Model $user)
    {
        if(is_null($user))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_user'), RequestType::CODE_400);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function forgot(Request $request)
    {
        try
        {
            // validation
            app(ForgotPasswordRequest::class);

            // get user
            $user = $this->userRepo
                ->with(['branch'])
                ->where('email', $request->only('email'));

            // if user has branch
            if (!is_null(RequestHelper::getBranchId())) $user->where('branch_id', RequestHelper::getBranchId());

            $user = $user->first();

            if (is_null($user))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.forgot_password_error')
                    ), RequestType::CODE_400);
            }

            if (method_exists($this, 'recentlyCreatedToken') && $this->recentlyCreatedToken($user))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.forgot_password_error')
                    ), RequestType::CODE_400);
            }

            // create token
            $token = $this->createPasswordToken($user);

            // send password reset link
            $user->notify(new PasswordResetNotification(PathHelper::getForgotPasswordLink($request->fullUrl(), $user, $token)));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('auth.forgot_password_success')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function resetVerify(Request $request)
    {
        try
        {
            $token = (!Helpers::IsNullOrEmpty($request->input('token'))) ? trim($request->input('token')) : null;

            // validate user id
            $reference = null;
            try { $reference = (!Helpers::IsNullOrEmpty($request->input('ref'))) ? Helpers::decodeHashedID($request->input('ref')) : null; } catch (Exception $e) {}

            if (is_null($token) || is_null($reference))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_200
                );
            }

            // get user
            $user = $this->userRepo->findById($reference, []);

            // validate token
            if (is_null($user) || !$this->exists($user, $token))
            {
                $this->deleteExpired();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('auth.reset_password_token_invalid')
                    ),
                    RequestType::CODE_200
                );
            }

            return (new UserResource($user, [ 'short' => true ]))
                ->additional([
                    'hint' => $user->hasOwnerAccess() ?
                        null
                        : ($user->isParent() ? LocalizationHelper::getTranslatedText('auth.reset_password_parent_hint') : LocalizationHelper::getTranslatedText('auth.reset_password_administrative_hint'))
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function reset(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(ResetPasswordRequest::class);

            // get user
            $user = $this->userRepo->findById(Helpers::decodeHashedID($request->input('user')), ['roles']);

            // get all users
            $users = $this->userRepo
                ->with(['roles', 'branch'])
                ->where('email', $user->email)
                ->when($user->hasOwnerAccess() || $user->isAdministrative(), function ($query) use ($user)
                {
                    $query->where('organization_id', $user->organization_id);
                })
                ->get();

            if($users->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.reset_password_error')
                    ), RequestType::CODE_400);
            }

            // update password
            $this->userRepo->whereIn('id', $users->pluck('id'))->update([
                'password' => $this->getHashedPassword($request->input('password'))
            ]);

            // delete reset password record
            $this->deleteExisting($user);

            // send sns if branch is connected to current gen (kinder connect)
            $users->each(function ($user)
            {
                if (!is_null($user->branch) && $user->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                        [
                            'organization' => $user->organization_id,
                            'branch' => $user->branch_id,
                            'subjectid' => $user->id,
                            'role' => $user->getRoleTypeForKinderConnect(),
                            'action' => CurrentGenConnectType::ACTION_UPDATE
                        ],
                        CurrentGenConnectType::USER_SUBJECT
                    );
                }
            });

            unset($user);
            unset($users);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('auth.reset_password_success')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function resetPassword(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(UserResetPasswordRequest::class);

            // update password
            $user = $this->userRepo->resetPassword(Helpers::decodeHashedID($request->input('user')), $request);

            // get login url
            $loginUrl = PathHelper::getBranchUrls($request->fullUrl(), $user->branch);

            // send password reset link
            $user->notify(new SendResetPasswordMail(
                $request->input('password'),
                !$user->branch->kinderconnect ? $loginUrl : PathHelper::getKinderConnectUrl($loginUrl)
            ));

            // send sns if branch is connected to current gen (kinder connect)
            if (!is_null($user->branch) && $user->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $user->organization_id,
                        'branch' => $user->branch_id,
                        'subjectid' => $user->id,
                        'role' => $user->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('auth.password_reset_success')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function syncKinderConnectProfile(Request $request)
    {
        try
        {
            $type = (!Helpers::IsNullOrEmpty($request->input('type'))) ? trim($request->input('type')) : null;
            $id = (!Helpers::IsNullOrEmpty($request->input('id'))) ? Helpers::decodeHashedID($request->input('id')) : null;

            if ($type === 'user')
            {
                $obj = $this->userRepo->findById($id, ['branch']);

                $this->publish($obj,
                    $obj->branch->kinderconnect,
                    'kinder_connect_user',
                    CurrentGenConnectType::ACTION_UPDATE,
                    CurrentGenConnectType::CHILD_SUBJECT);
            }
            else if ($type === 'child')
            {
                $obj = $this->childRepo->findById($id, ['branch']);

                $this->publish($obj,
                    $obj->branch->kinderconnect,
                    'kinder_connect_child',
                    CurrentGenConnectType::ACTION_UPDATE,
                    CurrentGenConnectType::CHILD_SUBJECT);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e);
        }
    }
}
