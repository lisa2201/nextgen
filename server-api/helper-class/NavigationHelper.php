<?php

use Kinderm8\User;

class NavigationHelper
{
    /**
     * get client side navigation menu
     *
     * @param $permissions
     * @return array
     */
    public static function getNavigations($permissions, User $user)
    {
        $navigationList = [];

        if(!is_array($permissions) || count($permissions) < 1) return $navigationList;

        // user permission level access
        if($user->isRoot())
        {
            $navigationList = include resource_path('client_navigations/root.php');
        }

        else if($user->isOwner() || $user->hasSiteManagerAccess())
        {
            $navigationList = include resource_path('client_navigations/owner.php');
        }

        else if($user->isAdministrative())
        {
            $navigationList = include resource_path('client_navigations/administration.php');
        }

        else if($user->isParent())
        {
            $navigationList = include resource_path('client_navigations/parent.php');
        }

        if(empty($navigationList)) return $navigationList;

        // common paths
        $commonPaths = include resource_path('client_navigations/common.php');

        // permission filters
        $filteredList = [];

        // check children list
        foreach ($navigationList as $item)
        {
            // admin (branch) only has access to parents view
            if($item['id'] === 'N04' && isset($item['children']) && auth()->user()->isAdministrative())
            {
                $filterData = Helpers::filter_by_key_array($item['children'], 'url', '/manage-parents');

                if(!is_null($filterData) && !auth()->user()->hasAdminRights())
                {
                    unset($item['children'][$filterData['key']]);

                    $item['children'] = array_values($item['children']);
                }
            }

            // remove child nav
            if(isset($item['children']))
            {
                $item['children'] = array_filter($item['children'], function ($perm) use ($permissions)
                {
                    return $perm['id'] === 'N00' || in_array($perm['id'], $permissions);
                });
            }

            array_push($filteredList, $item);
        }

        //nav list
        $filteredList = array_filter($filteredList, function($item) use ($permissions)
        {
            return $item['id'] === 'N00' || in_array($item['id'], $permissions);
        });

        // add common paths
        return array_merge($filteredList, $commonPaths);
    }
}
