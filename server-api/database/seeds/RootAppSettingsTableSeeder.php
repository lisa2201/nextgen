<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RootAppSettingsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $datetime = Carbon::now();

        DB::table('km8_root_app_settings')->insert([
            'key' => 'auto_accept_all_subscriptions',
            'description' => 'auto accept all subscriptions',
            'type' => 'boolean',
            'value' => 'false',
            'created_at' => $datetime,
            'updated_at' => $datetime,
        ]);
    }
}
