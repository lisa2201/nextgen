<?php

use Illuminate\Database\Seeder;
use Kinderm8\Role;
use \Kinderm8\Enums\RoleType as types;

class RoleTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL DEFERRED;');
        }

        DB::table('km8_roles')->truncate();

        $role = [

            // super admin - can't change this roles - not editable
            [
                'name' => 'portal-admin',
                'type' => types::SUPERADMIN,
                'display_name' => 'portal administrator',
                'description' => 'portal administrator',
                'color_code' => 'purple-600'
            ],

            // site manager - admin access to all branch - can't change this roles - not editable
            [
                'name' => 'portal-org-admin',
                'type' => types::ORGADMIN,
                'display_name' => 'portal organization administrator',
                'description' => 'portal administrator for organization',
                'color_code' => 'teal-600'
            ],

            // organizations - editable when user is super admin
            [
                'name' => 'org-admin',
                'type' => types::ADMINPORTAL,
                'display_name' => 'organization administrator',
                'description' => 'organization administrator',
                'color_code' => 'blue-600'
            ],

            // organizations - emergency contact user not visiable to subscriber
            [
                'name' => 'emergency-contact',
                'type' => types::PARENTSPORTAL,
                'display_name' => 'emergency contact',
                'description' => 'emergency contact',
                'color_code' => 'red-400'
            ]

        ];

        foreach ($role as $key => $value)
        {
            Role::create($value);
        }

        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }
    }
}
