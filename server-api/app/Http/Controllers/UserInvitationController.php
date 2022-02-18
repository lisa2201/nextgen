<?php

namespace Kinderm8\Http\Controllers;

use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\InvitationStoreRequest;
use Kinderm8\Http\Requests\InvitationUpdateRequest;
use Kinderm8\Http\Resources\UserInvitationResource;
use Kinderm8\Http\Resources\UserInvitationResourceCollection;
use Kinderm8\Notifications\UserInvitationAcceptMail;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Invitation\IInvitationRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\Subscriber;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use PathHelper;
use RequestHelper;
use Kinderm8\Notifications\SendUserSetupPasswordMail;
use Carbon\Carbon;

class UserInvitationController extends Controller
{
    use UserAccessibility, Subscriber;

    private $invitationRepo;
    private $userRepo;
    private $organizationRepo;
    private $branchRepo;
    private $roleRepo;
    private $snsService;

    public function __construct(IInvitationRepository $invitationRepo, IUserRepository $userRepo, IOrganizationRepository $organizationRepo, IBranchRepository $branchRepo, IRoleRepository $roleRepo, SNSContract $snsService)
    {
        $this->invitationRepo = $invitationRepo;
        $this->userRepo = $userRepo;
        $this->organizationRepo = $organizationRepo;
        $this->branchRepo = $branchRepo;
        $this->snsService = $snsService;
        $this->roleRepo = $roleRepo;
    }

    /**
     * check if user exists in invitation table
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function emailExistsInvitation(Request $request)
    {
        try {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'found' => $this->invitationRepo->findByEmail($request, 'User')
                    ]
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * verify user invitation
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function verifyInvitation(Request $request)
    {
        try
        {
            $token = (!Helpers::IsNullOrEmpty($request->input('token'))) ? trim($request->input('token')) : null;

            if (is_null($token))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_200
                );
            }

            $invitation = $this->invitationRepo->findByToken($token);

            return (new UserInvitationResource($invitation, ['basic' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * create user account
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function acceptInvitation(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            // app(InvitationAcceptRequest::class);

            // get invitation
            $invitationObj = $this->invitationRepo->findById(Helpers::decodeHashedID($request->input('reference')));

            // get organization
            $orgObj = $this->organizationRepo->findById($invitationObj->organization_id, [], false);

            // get branches
            $branchList = ($invitationObj->site_manager === '0') ? $this->branchRepo->findByIds($invitationObj->getRoleBranches(), [], false, true) : null;

            // get already exists parent users
            /*$registeredUsers = new Collection();
            if ($invitationObj->site_manager === '0' && !is_null($invitationObj->child_id))
            {
                $registeredUsers = $this->userRepo
                    ->where('email', $invitationObj->email)
                    ->whereIn('organization_id', $branchList->pluck('organization_id')->toArray())
                    ->whereIn('branch_id', $branchList->pluck('id')->toArray())
                    ->whereHas('roles', function ($query)
                    {
                        $query->where('type', 'ILIKE', '%'. RoleType::PARENTSPORTAL .'%');
                    })
                    ->get();
            }*/

            // create user accounts
            $initial_user = $this->invitationRepo->accept(
                $request,
                $invitationObj,
                $branchList,
                'User',
                'Role'
            );

            // get all attributes
            $initial_user->refresh();

            // link site manager role to branch access
            if ($initial_user->site_manager === '1')
            {
                // get branches
                $branches = $this->branchRepo->where('organization_id', $initial_user->organization_id)->get();

                if (!$branches->isEmpty())
                {
                    // add attributes
                    $request->request->add([
                        'action' => '0',
                        'reference' => $branches->pluck('index')
                    ]);

                    $this->linkBranchesToSiteManager($initial_user, $request);
                }
            }
            else
            {
                // send sns if branch is connected to current gen (kinder connect)
                if ($initial_user->isBranchUser() && $initial_user->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                        [
                            'organization' => $initial_user->organization_id,
                            'branch' => $initial_user->branch_id,
                            'subjectid' => $initial_user->id,
                            'role' => $initial_user->getRoleTypeForKinderConnect(),
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::USER_SUBJECT
                    );
                }
            }

            DB::commit();

            /*------------- Send Mail --------------*/

            $initial_user->notify(new UserInvitationAcceptMail(
                $invitationObj->site_manager === '0' ? PathHelper::getBranchUrlsKinderConnect($request->fullUrl(), $branchList, $initial_user->hasAdminRights()) : [],
                $invitationObj->site_manager === '1',
                $request->fullUrl(),
                $initial_user->pincode ? $initial_user->pincode : ''
            ));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request')
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * reset invitation
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function resendInvitation(Request $request)
    {
        DB::beginTransaction();

        $reference = null;

        try
        {
            $invitationObj = $this->invitationRepo->resend(Helpers::decodeHashedID($request->input('id')), $request);

            //reference for mail errors
            $reference = $invitationObj->id;

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new UserInvitationResource($invitationObj)
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            //remove row from database
            if (!is_null($reference)) $this->invitationRepo->manualDelete($reference);

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get invitation data
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $data = $this->invitationRepo->list([], $request);

        return (new UserInvitationResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters'])
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * send user creation invitation
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(InvitationStoreRequest::class);

            $invitationObj = $this->invitationRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_201
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * View user object
     * @param Request $request
     * @return array
     * @throws Exception
     */
    public function edit(Request $request)
    {
        try {
            $object = $this->invitationRepo->findById(Helpers::decodeHashedID($request->input('index')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new UserInvitationResource($object)
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update user object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        $reference = null;

        try
        {
            // validation
            app(InvitationUpdateRequest::class);

            $invitationObj = $this->invitationRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            //reference for mail errors
            $reference = $invitationObj->id;

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new UserInvitationResource($invitationObj)
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            //remove row from database
            if (!is_null($reference)) $this->invitationRepo->manualDelete($reference);

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete user object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try {
            $this->invitationRepo->delete(Helpers::decodeHashedID($request->input('id')));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getUserData(Request $request)
    {
        try {
            $userObj = $this->userRepo
                ->findByEmail($request, $request->input('user_email'))
                ->first();

            return (new UserResource($userObj, ['invitation' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function sendBulkInvitationParent(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $users = $this->userRepo->get(
                [ 'reference' => Helpers::decodeHashedID($request->input('slots')) ],
                [ 'branch'],
                $request,
                false,
                true
            );

            $users->each(function ($user) use ($request)
            {
                $user->invitation_date = Carbon::now()->addDays((int) config('user-settings.password_emil_expiry'));
                $user->save();

                $loginUrl = PathHelper::getBranchUrls($request->fullUrl(), $user->branch);

                $user->notify(
                    new SendUserSetupPasswordMail(
                        $user,
                        !$user->branch->kinderconnect ? $loginUrl : PathHelper::getKinderConnectUrl($loginUrl),
                        $user->organization,
                        $user->branch,
                        PathHelper::getUserPasswordSetupInvitationPath($request->fullUrl(), Helpers::hxCode($user->id))
                    )
                );
            });

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_send')
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
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
    public function verifyInvitationPasswordSetup(Request $request)
    {
        try
        {
            $token = (!Helpers::IsNullOrEmpty($request->input('token'))) ? trim($request->input('token')) : null;

            if (is_null($token))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_200
                );
            }

            $rowObj = $this->userRepo->findByIdForPasswordSetup(Helpers::decodeHashedID($token));

            return (new UserInvitationResource($rowObj, ['passwordSetup' => true]))
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
    public function acceptInvitationPasswordSetup(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $token = (!Helpers::IsNullOrEmpty($request->input('id'))) ? trim($request->input('id')) : null;

            if (is_null($token))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_200
                );
            }

            $rowObj = $this->userRepo->updatePassword(Helpers::decodeHashedID($token), $request->input('password'));

            $branchList = $this->branchRepo->find($rowObj->branch_id);
            $loginUrl = PathHelper::getBranchUrls($request->fullUrl(), $branchList);
            $url = $rowObj->branch->kinderconnect === false ? $loginUrl : PathHelper::getKinderConnectUrl($loginUrl);

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if ($rowObj->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $rowObj->organization_id,
                        'branch' => $rowObj->branch_id,
                        'subjectid' => $rowObj->id,
                        'role' => $rowObj->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $url
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getInvitationRoles(Request $request)
    {
        try
        {
            $invitation = $this->invitationRepo->findById(Helpers::decodeHashedID($request->input('id')));

            $roles = $this->roleRepo->get([
                'reference' => ($invitation->site_manager === '0') ? array_unique(array_merge(...array_column($invitation->role_data, 'roles'))) : $invitation->role_data
            ], [], $request, false);

            $formattedList = [];

            foreach ($invitation->role_data as $item)
            {
                array_push($formattedList, [
                    'branch' => ($invitation->site_manager === '0') ? Helpers::hxCode($item['branch']) : null,
                    'roles' => $roles->filter(function($role) use ($invitation, $item) { return ($invitation->site_manager === '0') ? in_array($role->id, $item['roles']) : $role->id === $item; })->pluck('display_name')->toArray()
                ]);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $formattedList
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
