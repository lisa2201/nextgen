<?php

use Kinderm8\Enums\RoleType;

class RoleHelpers
{
    public static function getGroup($type)
    {
        $groupname = '';

        if($type != null && is_array($type))
        {
            if (in_array(RoleType::ADMINPORTAL, $type))
            {
                $groupname = 'administration';
            }
            else if (in_array(RoleType::PARENTSPORTAL, $type))
            {
                $groupname = 'parent';
            }
            else if (in_array(RoleType::ORGADMIN, $type))
            {
                $groupname = 'owner';
            }
            else
            {
                $groupname = 'root';
            }
        }
        return $groupname;
    }

    public static function getRoleLevels($types)
    {
        $groupname = [];

        foreach ($types as $type)
        {
            if(RoleType::ADMINPORTAL == $type)
            {
                array_push($groupname, 'administration');
            }
            else if(RoleType::PARENTSPORTAL == $type)
            {
                array_push($groupname, 'parent');
            }
            else if(RoleType::ORGADMIN == $type)
            {
                array_push($groupname, 'owner');
            }
            else
            {
                array_push($groupname, 'root');
            }
        }

        $groupname = array_unique($groupname);

        if(auth()->user()->isOwner())
        {
            $key = array_search(RoleType::OWNER, $groupname);

            if($key != -1)
            {
                $d = $groupname[$key];
                unset($groupname[$key]);
                array_unshift($groupname, $d);
            }
        }

        return $groupname;
    }
}
