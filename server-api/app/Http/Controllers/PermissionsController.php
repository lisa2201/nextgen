<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\PermissionGroupUpdateRequest;
use Kinderm8\Http\Requests\PermissionUpdateRequest;
use Kinderm8\Http\Resources\PermissionResourceCollection;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Permission\IPermissionRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Repositories\User\IUserRepository;
use LocalizationHelper;
use RequestHelper;

class PermissionsController extends Controller
{
    private $permissionRepo;
    private $roleRepo;
    private $userRepo;
    private $organizationRepo;

    public function __construct(IPermissionRepository $permissionRepo, IRoleRepository $roleRepo, IUserRepository $userRepo, IOrganizationRepository $organizationRepo)
    {
        $this->permissionRepo = $permissionRepo;
        $this->roleRepo = $roleRepo;
        $this->userRepo = $userRepo;
        $this->organizationRepo = $organizationRepo;
    }

    /**
     * get all permissions
     * @return JsonResponse
     */
    public function get()
    {
        $permissions = [];

        try
        {
            $permissions = $this->permissionRepo->list([], false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new PermissionResourceCollection($permissions))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getGroup()
    {
        try
        {
            // get permission list
            $permissions = $this->permissionRepo->list([], false);

            // get permission migration list
            $permissionMigration = DB::table('permission_migration')->get()->pluck('migration')->toArray();

            // get new permissions
            $insertNewPath = [];

            foreach (File::allFiles(resource_path('permission-data')) as $file)
            {
                $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

                if(count($permissionMigration) > 0 && in_array($filename, $permissionMigration)) continue;

                array_push($insertNewPath, $filename);
            }

            // check any different in table
            $list = [];

            foreach (File::allFiles(resource_path('permission-data')) as $file)
            {
                $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

                if (in_array($filename, $insertNewPath)) continue;

                // get data from file
                $group = include($file->getPathname());

                // map nav id
                if (count($group) > 1)
                {
                    $nav_ref = $group[0]['navigation_ref_id'];

                    array_walk($group, function(&$item) use ($nav_ref)
                    {
                        $item['navigation_ref_id'] = $nav_ref;
                    });

                    unset($nav_ref);
                }

                // get mapped data
                $tableMap = array_filter($permissions->map(function ($permission) use ($group)
                {
                    return ($group[0]['navigation_ref_id'] === $permission->navigation_ref_id) ? strtolower($permission->name) : null;
                })->toArray());

                // check if its already inserted
                $group = array_map(function (&$item) use ($tableMap, $filename)
                {
                    $item['status'] = in_array($item['name'], $tableMap);
                    $item['file'] = $filename;

                    return $item;
                }, $group);

                // add to list
                $list = array_merge($list, $group);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'permissions' => new PermissionResourceCollection($permissions, [ 'showAdditional' => true ]),
                        'new' => $insertNewPath,
                        'list' => $list
                    ]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getNewPermissionGroup()
    {
        try
        {
            // get new permissions
            $permissionMigration = DB::table('permission_migration')->get()->pluck('migration')->toArray();

            $insertNewPath = [];

            foreach (File::allFiles(resource_path('permission-data')) as $file)
            {
                $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

                if(count($permissionMigration) > 0 && in_array($filename, $permissionMigration)) continue;

                array_push($insertNewPath, [ 'migration' => $filename ]);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $insertNewPath
                ), RequestType::CODE_200);
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
     * @throws Exception
     */
    public function updatePermissionGroups(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(PermissionGroupUpdateRequest::class);

            $insertPath = $this->getPermissionResources($request->input('files'));

            if(count($insertPath) > 0)
            {
                $permission = $this->getPermissionMap($insertPath);

                // add permission data
                $permissionType = $this->updatePermissionTable($permission);

                // update user permissions
                $this->updatePermissions($permissionType, $insertPath, true);

                DB::commit();
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function resolvePermissionConflicts(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $insertPath = $this->getPermissionResources(array_column($request->input('list'), 'file'));

            if(count($insertPath) > 0)
            {
                $permission = $this->getPermissionMap($insertPath);

                // add permission data
                $permissionType = $this->updatePermissionTable($permission);

                // update user permissions
                $this->updatePermissions($permissionType);

                DB::commit();
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get permission list by role
     * @param Request $request
     * @return JsonResponse
     */
    public function getPermissionsByRole(Request $request)
    {
        $permissions = [];

        try
        {
            $id = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;

            if(!is_null($id))
            {
                $permissions = $this->permissionRepo->findByRole($this->roleRepo->where('id', $id)->get(), []);
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new PermissionResourceCollection($permissions))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? strtoupper($request->input('type')) : null;

            $permissions = $this->permissionRepo->list([
                'type' => RoleType::ROLE_LEVELS[$type]
            ], false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'perms' => new PermissionResourceCollection($permissions, [ 'showPermType' => true ])
                    ]
                ), RequestType::CODE_200);
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
     */
    public function getUserPermissions(Request $request)
    {
        try
        {
            $user = $this->userRepo->findById(Helpers::decodeHashedID($request->input('index')), [ 'roles', 'roles.permissions' ]);

            $permissions = $this->permissionRepo->findByRole($user->roles, []);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new PermissionResourceCollection($permissions, [ 'showPermType' => true ])
                ), RequestType::CODE_200);
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
     */
    public function getPermissionByRoleType(Request $request)
    {
        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? strtoupper($request->input('type')) : null;

            if (RoleType::ROLE_LEVELS[$type] === RoleType::PARENTSPORTAL)
            {
                $role = $this->roleRepo->findByName('emergency-contact', ['permissions']);
            }
            else
            {
                $role = $this->roleRepo->findByType(RoleType::ROLE_LEVELS[$type], [], ['permissions']);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new PermissionResourceCollection($role->permissions, [ 'showPermType' => true ])
                ), RequestType::CODE_200);
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
     * @throws Exception
     */
    public function updateUserPermissions(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(PermissionUpdateRequest::class);

            // get site manager role
            if (RoleType::ROLE_LEVELS[strtoupper($request->input('type'))] === RoleType::PARENTSPORTAL)
            {
                $role = $this->roleRepo->findByName('emergency-contact', []);
            }
            else
            {
                $role = $this->roleRepo->findByType(RoleType::ORGADMIN, [], []);
            }

            // attach permission to role
            $this->permissionRepo->attachPermissionsToRole(Helpers::decodeHashedID($request->input('perms')), $role);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
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
     * @param $list
     * @return array
     */
    private function getPermissionResources($list): array
    {
        $insertPath = [];

        foreach (File::allFiles(resource_path('permission-data')) as $file)
        {
            $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

            if(!in_array($filename, $list)) continue;

            array_push($insertPath, [
                'migration' => $filename,
                'path' => $file->getPathname()
            ]);
        }

        return $insertPath;
    }

    /**
     * @param $insertPath
     * @return array
     */
    private function getPermissionMap($insertPath): array
    {
        $permission = [];

        foreach ($insertPath as $key => $item)
        {
            $list = include($item['path']);

            if(count($list) > 0)
            {
                if (count($list) > 1)
                {
                    $nav_ref = $list[0]['navigation_ref_id'];

                    array_walk($list, function(&$item) use ($nav_ref)
                    {
                        $item['navigation_ref_id'] = $nav_ref;
                    });

                    unset($nav_ref);
                }

                $permission = array_merge($permission, $list);

                unset($insertPath[$key]['path']);
                unset($list);
            }
        }

        return $permission;
    }

    /**
     * @param $permission
     * @return array
     */
    private function updatePermissionTable($permission): array
    {
        $permissionType = [];

        foreach ($permission as $key => $value)
        {
            array_push($permissionType, $value['type']);

            $this->permissionRepo->updateOrCreate(
                [
                    'name' => $value['name'],
                    'type' => $value['type'],
                    'navigation_ref_id' => $value['navigation_ref_id'],
                    'perm_slug' => $value['perm_slug']
                ],
                [
                    'guard_name' => 'api',
                    'access_level' => $value['access_level'],
                    'display_name' => $value['display_name'],
                    'description' => $value['description'],
                ]
            );
        }

        return $permissionType;
    }

    /**
     * @param $permissionType
     * @param array $insertPath
     * @param bool $update_migration
     */
    private function updatePermissions($permissionType, $insertPath = [], bool $update_migration = false)
    {
        $permissionType = array_unique($permissionType);

        // add permission migration data
        if($update_migration && !empty($insertPath))
        {
            foreach ($insertPath as $key => $value) app('Kinderm8\PermissionMigration')->updateOrCreate([ 'migration' => $value['migration'] ]);
        }

        // add new permission to role ['portal-admin', 'portal-org-admin']
        $permissionObjs = $this->permissionRepo->whereIn('type', $permissionType)->get();

        $superUser = $this->roleRepo->where('name', 'portal-admin')->get()->first();
        if($superUser != null) $superUser->givePermissionTo($permissionObjs);

        $siteManager = $this->roleRepo->where('name', 'portal-org-admin')->get()->first();
        if($siteManager != null) $siteManager->givePermissionTo($permissionObjs);

        unset($permissionType);
        unset($permissionObjs);
    }
}
