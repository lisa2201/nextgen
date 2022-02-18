<?php

namespace Kinderm8\Repositories\Role;

use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Role;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class RoleRepository implements IRoleRepository
{
    use UserAccessibility;

    private $role;

    public function __construct(Role $role)
    {
        $this->role = $role;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->role, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        $list = $this->role
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            });

        // access
        $list = $this->attachAccessibilityQuery($list, null, null, true);

        if (is_array($args) && !empty($args))
        {
            $list
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['reference']), function ($query) use ($args)
                {
                    return (is_array($args['reference'])) ? $query->whereIn('id', $args['reference']) : $query->where('id', $args['reference']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $list->orderBy('date', 'asc');
        }

        return $list->get();
    }

    /**
     * @param $args
     * @return \Illuminate\Database\Eloquent\Builder[]|\Illuminate\Database\Eloquent\Collection|Builder[]|Collection
     */
    public function list($args)
    {
        $ignoreRoles = [];

        $roles = $this->role->query();

        $roles = $this->attachAccessibilityQuery($roles, null, null, true);

        $roles
            //portal admin
            ->when(auth()->user()->isRoot(), function ($query) use ($ignoreRoles)
            {
                array_push($ignoreRoles, 'portal-admin');

                return $query->whereIn('type', [
                    RoleType::SUPERADMIN
                ]);
            })
            // site-manager && use has site manager access
            ->when(auth()->user()->hasOwnerAccess(), function ($query)
            {
                return $query->whereIn('type', [
                    RoleType::ORGADMIN,
                    RoleType::ADMINPORTAL,
                    RoleType::PARENTSPORTAL
                ]);
            });

        return $roles
            ->whereNotIn('name', $ignoreRoles)
            ->orderBy('id', 'asc')
            ->get();
    }

    /**
     * @param Request $request
     * @return JsonResponse|Role
     * @throws Exception
     */
    public function store(Request $request)
    {
        $orgId = (auth()->user()->hasOwnerAccess())
            ? auth()->user()->organization_id
            : (($request->input('org') != '') ? Helpers::decodeHashedID($request->input('org')) : null);

        if(!is_null($orgId))
        {
            $exists = $this->role->where('organization_id', $orgId)
                    ->where('name', '=', $request->input('name'))
                    ->count() > 0;

            if($exists)
            {
                throw new Exception(LocalizationHelper::getTranslatedText('role.resource_exists'), ErrorType::CustomValidationErrorCode);
            }
        }

        $roleNew = new $this->role;
        $roleNew->organization_id = $orgId;
        $roleNew->name = $request->input('name');
        $roleNew->type = $request->input('level');
        $roleNew->display_name = $request->input('display');
        $roleNew->description = ($request->input('desc') != '') ? $request->input('desc') : null;
        $roleNew->color_code = ($request->input('color') != '') ? $request->input('color') : null;
        $roleNew->is_admin = ($request->input('has_admin_privileges') == false) ? '0' : '1';
        $roleNew->editable = 1;
        $roleNew->deletable = auth()->user()->isRoot() ? 1 : 0;

        $roleNew->save();

        return $roleNew;
    }

    /**
     * @param $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id)
    {
        $role = $this->role->where('id', $id)->first();

        if (is_null($role))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $role;
    }

    /**
     * @param string $type
     * @param array $args
     * @param array $depends
     * @return Model|Role|object|null
     * @throws ResourceNotFoundException
     */
    public function findByType(string $type, array $args, array $depends)
    {
        $role = $this->role->where('type', $type);

        $role->when(isset($depends) && !empty($depends), function($query) use ($depends)
        {
            return $query->with($depends);
        });

        if (is_array($args) && !empty($args))
        {
            $role
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['administrator']), function ($query) use ($args)
                {
                    return $query->where('is_admin', $args['administrator']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }

        $role = $role->first();

        if (is_null($role))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $role;
    }

    /**
     * @param string $name
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByName(string $name, array $depends)
    {
        $role = $this->role->where('name', $name);

        $role->when(isset($depends) && !empty($depends), function($query) use ($depends)
        {
            return $query->with($depends);
        });

        $role = $role->first();

        if (is_null($role))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $role;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request)
    {
        $roleObj = $this->findById($id);

        $roleObj->name = $request->input('name');
        $roleObj->type = $request->input('level');
        $roleObj->display_name = $request->input('display');
        $roleObj->description = ($request->input('desc') != '') ? $request->input('desc') : null;
        $roleObj->color_code = ($request->input('color') != '') ? $request->input('color') : null;
        $roleObj->is_admin = ($request->input('has_admin_privileges') == false) ? '0' : '1';

        $roleObj->save();

        return $roleObj;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $role = $this->findById($id);

        $role->delete();

        return true;
    }

    /**
     * @param array $role_ids
     * @param Model $user
     */
    public function attachRolesToUser(array $role_ids, Model $user)
    {
        $roles = $this->role->find(Helpers::decodeHashedID($role_ids));

        $user->syncRoles($roles);
    }

    /**
     * @param $args
     * @return Collection
     */
    public function listRoleMigration($args)
    {
        $ignoreRoles = [];

        $roles = $this->role->query();

        $roles = $this->attachAccessibilityQuery($roles, null, null, true);

        $roles->whereIn('type', [
            RoleType::ORGADMIN,
            RoleType::ADMINPORTAL,
        ]);

        return $roles
            ->whereNotIn('name', $ignoreRoles)
            ->orderBy('id', 'asc')
            ->get();
    }
}
