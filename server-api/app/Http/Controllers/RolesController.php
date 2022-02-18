<?php

namespace Kinderm8\Http\Controllers;

use Arr;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\RoleStoreRequest;
use Kinderm8\Http\Requests\RoleUpdateRequest;
use Kinderm8\Http\Resources\PermissionResourceCollection;
use Kinderm8\Http\Resources\RoleResource;
use Kinderm8\Http\Resources\RoleResourceCollection;
use Kinderm8\Repositories\Permission\IPermissionRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use LocalizationHelper;
use RequestHelper;

class RolesController extends Controller
{
    private $roleRepo;
    private $permissionRepo;

    public function __construct(IRoleRepository $roleRepo, IPermissionRepository $permissionRepo)
    {
        $this->roleRepo = $roleRepo;
        $this->permissionRepo = $permissionRepo;
    }

    /**
     * get all role data
     * @return JsonResponse
     */
    public function get()
    {
        $roles = [];

        try
        {
            $roles = $this->roleRepo->list([]);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new RoleResourceCollection($roles))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /***
     * Get role related data
     * @return mixed
     * @throws ServerErrorException
     */
    public function getDependency()
    {
        try
        {
            //get permissions
            $resourcePerms = new PermissionResourceCollection($this->permissionRepo->getByRole(), [ 'showPermType' => true ]);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'perms' => $resourcePerms,
                        'rlevels' => Arr::sort(RoleType::PORTAL_ROLE_LEVELS_MAP)
                    ]
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * Store role object
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
            app(RoleStoreRequest::class);

            $roleNew = $this->roleRepo->store($request);

            //attach permission to role
            $this->permissionRepo->attachPermissionsToRole(Helpers::decodeHashedID($request->input('selectedPerms')), $roleNew);

            DB::commit();

            //get all fields
            $roleNew->refresh();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new RoleResource($roleNew)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * View/get role object
     * @param Request $request
     * @return array
     * @throws ServerErrorException
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->roleRepo->findById(Helpers::decodeHashedID($request->input('index')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new RoleResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update role object
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
            app(RoleUpdateRequest::class);

            $roleObj = $this->roleRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            //update permission
            $this->permissionRepo->attachPermissionsToRole(Helpers::decodeHashedID($request->input('selectedPerms')), $roleObj);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new RoleResource($roleObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete role object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->roleRepo->delete(Helpers::decodeHashedID($request->input('id')));

            DB::commit();

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
}
