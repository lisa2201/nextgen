<?php

use Illuminate\Database\Seeder;
use Kinderm8\Permission;
use Kinderm8\Role;
use \Kinderm8\Enums\RoleType as types;

class TempRolesForOrgAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run($org_id)
    {
        $tempRole = [
            [
                'name' => 'branch-admin',
                'type' => types::ADMINPORTAL,
                'display_name' => 'branch administrator',
                'description' => 'branch administrator',
                'color_code' => 'cyan-600',
                'is_admin' => '1',
                'deletable' => true,
                'editable' => true
            ],
            [
                'name' => 'manager',
                'type' => types::ADMINPORTAL,
                'display_name' => 'manager',
                'description' => 'manager account',
                'color_code' => 'blue-600',
                'deletable' => true,
                'editable' => true
            ],
            [
                'name' => 'staff',
                'type' => types::ADMINPORTAL,
                'display_name' => 'staff',
                'description' => 'staff account',
                'color_code' => 'orange-600',
                'deletable' => true,
                'editable' => true
            ],

            //parent
            [
                'name' => 'parent',
                'type' => types::PARENTSPORTAL,
                'display_name' => 'parent',
                'description' => 'parent account',
                'color_code' => 'green-600',
                'deletable' => false,
                'editable' => true
            ],
            [
                'name' => 'guardian',
                'type' => types::PARENTSPORTAL,
                'display_name' => 'guardian',
                'description' => 'guardian account',
                'color_code' => 'pink-600',
                'deletable' => false,
                'editable' => true
            ]
        ];

        foreach ($tempRole as $value)
        {
            $roleNew = new Role();
            $roleNew->organization_id = $org_id;
            $roleNew->name = $value['name'];
            $roleNew->type = $value['type'];
            $roleNew->display_name = $value['display_name'];
            $roleNew->description = $value['description'];
            $roleNew->color_code = $value['color_code'];
            $roleNew->editable = $value['editable'];
            $roleNew->deletable = $value['deletable'];
            $roleNew->save();

            //attach permissions
            $perms = null;

            if($value['type'] != types::PARENTSPORTAL)
            {
                $perms = Permission::whereIn('name', ['dashboard-access'])->get();
            }
            else
            {
                //parent portal
                $perms = Permission::where('type', 'like', '%Parent Poral%')->get();
            }

            if($perms != null)
            {
                $roleNew->syncPermissions($perms);
            }

            unset($perms);
            unset($roleNew);
        }
    }
}
