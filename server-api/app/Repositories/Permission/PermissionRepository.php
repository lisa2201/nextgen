<?php

namespace Kinderm8\Repositories\Permission;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\HigherOrderCollectionProxy;
use Kinderm8\Enums\RoleType;
use Kinderm8\Permission;
use Kinderm8\Role;
use Kinderm8\Traits\UserAccessibility;

class PermissionRepository implements IPermissionRepository
{
    use UserAccessibility;

    private $permission;

    public function __construct(Permission $permission)
    {
        $this->permission = $permission;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->permission, $method], $args);
    }

    /**
     * @param $args
     * @return Builder[]|Collection
     */
    public function list(array $args, bool $withTrashed)
    {
        $permissions = $this->permission->query();

        //access
        $permissions = $this->attachAccessibilityQuery($permissions);

        if($withTrashed)
        {
            $permissions->withTrashed();
        }

        if(is_array($args) && !empty($args))
        {
            $permissions
                ->when(isset($args['type']), function ($query) use ($args)
                {
                    return $query->where('access_level', 'like', '%' . $args['type'] . '%');
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
            $permissions
                ->orderBy('navigation_ref_id', 'asc')
                ->orderBy('perm_slug', 'asc');
        }

        return $permissions->get();
    }

    /**
     * @param $roles
     * @param array $columns
     * @return array|Collection|\Illuminate\Support\Collection|HigherOrderCollectionProxy
     */
    public function findByRole($roles, array $columns = [])
    {
        if(is_null($roles) || empty($roles))
        {
            return [];
        }

        if($roles instanceof Collection)
        {
            $permissions = new Collection();

            foreach ($roles as $role)
            {
                $permissions = $permissions->merge($role->permissions);
            }

            return empty($columns) ? $permissions->unique() : $permissions->unique()->map->only($columns);
        }
        else
        {
            return empty($columns) ? $roles->permissions : $roles->permissions->map->only($columns);
        }
    }

    /**
     * get roles for user type
     * @return mixed
     */
    public function getByRole()
    {
        //super admin or site manager
        if (auth()->user()->isRoot() || auth()->user()->hasOwnerAccess())
        {
            $level = [
                RoleType::ORGADMIN,
                RoleType::ADMINPORTAL,
                RoleType::PARENTSPORTAL
            ];
        }
        // parent
        else if (auth()->user()->hasRole('parent'))
        {
            $level = [
                RoleType::PARENTSPORTAL
            ];
        }
        // administration
        else
        {
            $level = [
                RoleType::ADMINPORTAL,
                RoleType::PARENTSPORTAL
            ];
        }

        return $this->permission->where(function ($query) use ($level)
            {
                foreach ($level as $keyword)
                {
                    $query->orWhere('access_level', 'like', '%' . $keyword . '%');
                }
            })
            ->orderBy('navigation_ref_id', 'asc')
            ->orderBy('perm_slug', 'asc')
            ->get();
    }

    /**
     * @param array $perms_ids
     * @param Model $role
     */
    public function attachPermissionsToRole(array $perms_ids, Model $role)
    {
        $permissions = $this->permission->find($perms_ids);

        $role->syncPermissions($permissions);
    }
}
