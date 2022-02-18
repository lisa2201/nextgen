<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $this->call(SubscriptionPlansSeeder::class);
        $this->call(RoleTableSeeder::class);
        $this->call(PermissionTableSeeder::class);
        $this->call(UsersTableSeeder::class);
        $this->call(RootAppSettingsTableSeeder::class);
        $this->call(AddonTableSeeder::class);
        $this->call(WaitlistEnrolmentSeeder::class);
        //$this->call(ChildAttendanceAttributeSeeder::class);
    }
}
