<?php

use Illuminate\Database\Seeder;
use Carbon\Carbon;
use Kinderm8\Enums\RoleType;
use Kinderm8\Permission;
use Kinderm8\Role;
use Kinderm8\User;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     * @throws Exception
     */
    public function run()
    {
        try
        {
            if(config('database.default') === 'mysql')
            {
                DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
            }
            else
            {
                DB::statement('SET CONSTRAINTS ALL DEFERRED;');
            }

            DB::table('km8_users')->truncate();

            $date = Carbon::now();

            DB::beginTransaction();

            /*------------ MAIN ADMIN ------------*/
            DB::table('km8_users')->insert([
                'first_name' => 'super',
                'last_name' => 'admin',
                'email' => 'superadmin@km8.com',
                'password' => bcrypt('admin'),
                'first_time_login' => false,
                'email_verified' => true,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            if(config('database.default') === 'mysql')
            {
                DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
            }
            else
            {
                DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
            }

            /*****************************************/
            /************* Attach Roles **************/

            //super admin
            $superadmin = Role::where('name', 'portal-admin')->get()->first();
            $superadmin->syncPermissions(Permission::all());

            //site manager
            $sitemanager = Role::where('name', 'portal-org-admin')->get()->first();
            $sitemanager->syncPermissions(Permission::where(function ($query) { $query->where('access_level', 'like', '%' . RoleType::ORGADMIN . '%'); })->get());

            /**************************************************/
            /************* Attach Roles to User **************/

            $user = User::where('email', '=', 'superadmin@km8.com')->get()->first();
            $user->assignRole($superadmin);
        }
        catch (Exception $e)
        {
            var_dump($e->getMessage());

            DB::rollBack();
        }

        DB::commit();
    }
}
