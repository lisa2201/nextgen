<?php

namespace Kinderm8\Http\Controllers;

use DB;
use Exception;
use Illuminate\Validation\ValidationException;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\Branch\BranchNotFoundException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Http\Resources\RoleResourceCollection;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Requests\UserStoreRequest;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use RequestHelper;

class UserController extends Controller
{
    private $userRepo;
    private $organizationRepo;
    private $branchRepo;
    private $roleRepo;

    private $snsService;

    public function __construct(IUserRepository $userRepo, IOrganizationRepository $organizationRepo, IBranchRepository $branchRepo, IRoleRepository $roleRepo, SNSContract $SNSService)
    {
        $this->userRepo = $userRepo;
        $this->organizationRepo = $organizationRepo;
        $this->branchRepo = $branchRepo;
        $this->roleRepo = $roleRepo;
        $this->snsService = $SNSService;
    }

    /**
     * check if user email exists
     * @param Request $request
     * @return JsonResponse {boolean}
     * @throws ServerErrorException
     */
    public function checkEmail(Request $request)
    {
        try
        {
            $collection = $this->userRepo->findByEmail($request, rtrim($request->input('value')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    !empty($collection)
            ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * Get user related data
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $orglist = null;
            $resourceOrg = null;

            $branchlist = null;
            $resourceBranch = null;

            $roleList = null;
            $resourceRole = null;

            $roleLevels = RoleType::PORTAL_ROLE_LEVELS_MAP;

            /* --------------- get org list -----------------*/

            if(auth()->user()->isRoot())
            {
                $orglist = $this->organizationRepo
                    ->withTrashed()
                    ->orderBy('id', 'asc')
                    ->get();
            }

            /* --------------- get roles & branchs -----------------*/

            if (auth()->user()->isRoot())
            {
                if($orglist->count() != 0)
                {
                    $branchlist = $this->branchRepo->findByOrg($orglist->first()->id, [ 'status' => '0' ], false);
                }

                $roleList = $this->roleRepo
                    ->whereNotIn('name', ['portal-admin'])
                    ->whereIn('type', [
                        RoleType::SUPERADMIN
                    ])
                    ->get();
            }
            else if(auth()->user()->hasOwnerAccess())
            {
                $branchlist = $this->branchRepo->findByOrg(auth()->user()->organization_id, [ 'status' => '0' ], false);

                // organization does not have any branches
                if($branchlist->count() < 1)
                {
                    unset($branchlist);

                    throw new BranchNotFoundException('branch not found', 404);
                }

                $roleList = $this->roleRepo
                    ->where('organization_id', '=', auth()->user()->organization_id)
                    ->whereIn('type', [
                        RoleType::ORGADMIN,
                        RoleType::ADMINPORTAL,
                        RoleType::PARENTSPORTAL
                    ])
                    ->get();
            }
            else
            {
                $branchlist = auth()->user()->branch()->get();

                $roleList = $this->roleRepo
                    ->where('organization_id', '=', auth()->user()->organization_id)
                    ->whereIn('type', [
                        RoleType::ADMINPORTAL,
                        RoleType::PARENTSPORTAL
                    ])
                    ->get();

                $roleLevels = (auth()->user()->isAdministrative() && auth()->user()->hasAdminRights())
                    ? RoleType::ADMIN_ROLE_LEVELS_MAP
                    : RoleType::ADMINISTRATIVE_ROLE_LEVELS_MAP;
            }

            // org
            if($orglist != null) $resourceOrg = new OrganizationResourceCollection($orglist, [ 'basic' => true ]);

            //branch
            if ($branchlist != null) $resourceBranch = new BranchResourceCollection($branchlist, [ 'short' => true ]);

            //roles
            if ($roleList != null) $resourceRole = new RoleResourceCollection($roleList, [ 'basic' => true ]);

            /* -----------------------------------------*/

            $resArray = [
                'roles' => $resourceRole,
                'branches' => $resourceBranch,
                'rolelevels' => $roleLevels
            ];

            if(!is_null($resourceOrg)) $resArray['orgs'] = $resourceOrg;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $resArray
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            if($e instanceof BranchNotFoundException)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('user.create_user_before_check')
                ), RequestType::CODE_404);
            }
            else
            {
                throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
            }
        }
    }

    /**
     * get user list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $data = $this->userRepo->list([], $request);

        return (new UserResourceCollection($data['list'], [ 'profile' => true ]))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * update user status
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function updateStatus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $userAcc = $this->userRepo->updateStatus(Helpers::decodeHashedID($request->input('id')), $request);

            // send sns if branch is connected to current gen (kinder connect)
            if($userAcc->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $userAcc->organization_id,
                        'branch' => $userAcc->branch_id,
                        'subjectid' => $userAcc->id,
                        'role' => $userAcc->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new UserResource($userAcc)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * Store user object
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(UserStoreRequest::class);
               
            if($request->input('phone') != '') {
                $phone_exists = $this->userRepo
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->where('phone', '=', $request->input('phone'))
                    ->count();

                if ($phone_exists > 0)
                {
                    return response()->json(
                        RequestHelper::sendResponse(RequestType::CODE_404, 'Mobile number already exists, Please enter different mobile number'
                        ), RequestType::CODE_404);
                }
            }

            $email =  $request->input('email');
            $email_exists = $this->userRepo
                ->where('organization_id', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id )
                ->where(function($query) use($email) {
                    $query->where('email',$email)
                    ->orWhere('second_email', $email);
                })
                ->count();

            if ($email_exists > 0) {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'Email already exists, Please enter different email address'
                    ), RequestType::CODE_404);
            }


            $userAcc = $this->userRepo->store($request, 'Role');

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if($userAcc->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $userAcc->organization_id,
                        'branch' => $userAcc->branch_id,
                        'subjectid' => $userAcc->id,
                        'role' => $userAcc->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            //get all fields
            $userAcc->refresh();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $userAcc->index
                ), RequestType::CODE_201);
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
     * get user object
     * @param Request $request
     * @return array
     * @throws Exception
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->userRepo->findById(Helpers::decodeHashedID($request->input('index')), []);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new UserResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
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

        try
        {
            // validation
            if(in_array($request->route()->getName(), ['device-update-profile', 'device-update-user'])){
                // mobile route

                if($request->input('phone') != '') {
                    $phone_exists = $this->userRepo
                        ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('id', '!=', Helpers::decodeHashedID($request->input('id')))
                        ->where('phone', '=', $request->input('phone'))
                        ->count();

                    if ($phone_exists > 0)
                    {
                        return response()->json(
                            RequestHelper::sendResponse(RequestType::CODE_404, 'Mobile number already exists, Please enter different mobile number'
                            ), RequestType::CODE_404);
                    }
                }

                $email =  $request->input('email');
                $email_exists = $this->userRepo
                    ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                    ->where('branch_id', auth()->user()->branch_id ? auth()->user()->branch_id : null)
                    ->where('id', '!=', Helpers::decodeHashedID($request->input('id')))
                    ->where(function($query) use($email) {
                        $query->where('email',$email)
                        ->orWhere('second_email', $email);
                    })
                    ->count();

                if ($email_exists > 0) {
                    return response()->json(
                        RequestHelper::sendResponse(RequestType::CODE_404, 'Email already exists, Please enter different email address'
                        ), RequestType::CODE_404);
                }

                if($request->input('second_email') != '') {
                    $sec_email =  $request->input('second_email');
                    $sec_email_exists = $this->userRepo
                        ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id ? auth()->user()->branch_id : null)
                        ->where('id', '!=', Helpers::decodeHashedID($request->input('id')))
                        ->where(function($query) use($sec_email) {
                            $query->where('email',$sec_email)
                            ->orWhere('second_email', $sec_email);
                        })
                        ->count();

                    if ($sec_email_exists > 0) {
                        return response()->json(
                            RequestHelper::sendResponse(RequestType::CODE_404, 'Secondary Email already exists, Please enter different email address'
                            ), RequestType::CODE_404);
                    }
                }

            }

            $userAcc = $this->userRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            // send sns if branch is connected to current gen (kinder connect)
            if($userAcc->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $userAcc->organization_id,
                        'branch' => $userAcc->branch_id,
                        'subjectid' => $userAcc->id,
                        'role' => $userAcc->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new UserResource($userAcc)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

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

        try
        {
            $user = $this->userRepo->delete(Helpers::decodeHashedID($request->input('id')));

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if($user->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $user->organization_id,
                        'branch' => $user->branch_id,
                        'subjectid' => $user->id,
                        'role' => $user->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            unset($user);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);
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
     */
    public function getAllParents(Request $request)
    {
        $data = $this->userRepo->getAllParents();

        return (new UserResourceCollection($data,[ 'passwordSetup' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getAllActiveParents(Request $request)
    {
        $data = $this->userRepo->getAllActiveParents($request);

        return (new UserResourceCollection($data,['financeAccounts' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function updateRoom(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;

            $userObj = $this->userRepo->updateRooms(Helpers::decodeHashedID($request->input('user')), $request, $type);

            $room_id = Helpers::decodeHashedID($request->input('room'));

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_room', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $room_id,
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::ROOM_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText(($type === RequestType::ACTION_TYPE_NEW) ? 'response.success_update' : 'response.success_delete'),
                    new UserResource($userObj)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function findByBranch(Request $request)
    {
        $data = $this->userRepo->findByBranchStaffAndParent(Helpers::decodeHashedID($request->input('index')), [], []);

        return (new UserResourceCollection($data,['basic' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function sendBulkSNS(Request $request)
    {
        $data = $this->userRepo->findByBranchStaffAndParent(Helpers::decodeHashedID($request->input('index')), [], []);

        foreach($data as $user){

            $userObj = $this->userRepo->findById(Helpers::decodeHashedID($user->index), ['branch', 'organization']);

            if($user->branch->kinderconnect)
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

            sleep(2);

        }
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update')
            ), RequestType::CODE_200);
    }

    public function generatePin(Request $request)
    {
        DB::beginTransaction();

        try
        {


            $userAcc = $this->userRepo->generatePin(Helpers::decodeHashedID($request->input('id')), $request);

            // send sns if branch is connected to current gen (kinder connect)
            if($userAcc->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $userAcc->organization_id,
                        'branch' => $userAcc->branch_id,
                        'subjectid' => $userAcc->id,
                        'role' => $userAcc->getRoleTypeForKinderConnect(),
                        'action' => CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new UserResource($userAcc)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get user list
     * @param Request $request
     * @return JsonResponse
     */
    public function deviceGetStaff(Request $request)
    {
        try
        {
            $data = $this->userRepo->getStaffList('User');

            $type = (!is_null($request->input('type')))? $request->input('type') : 'profile';

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    new UserResourceCollection($data, [ $type => true ])
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }        

    }

}
