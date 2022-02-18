<?php

use Kinderm8\Permission;
use Kinderm8\User;

class UserHelpers
{
    public static function getRootPermissions()
    {
        return Permission::get()->pluck('name');
    }

    public static function getOrgAdministratorModules()
    {
        $json = json_decode(file_get_contents(base_path() . "/module_configs/default.json"), true);

        return Permission::whereIn('type', $json['admin_modules'])
            ->get()
            ->pluck('name');
    }

    public static function getAllUserPermissions(User $user)
    {
        $role_list = [];

        foreach ($user->roles as $permissions)
        {
            foreach ($permissions->perms as $permission)
            {
                if(!in_array($permission->name, $role_list))
                {
                    array_push($role_list, $permission->name);
                }
            }
        }

        return $role_list;
    }
}
