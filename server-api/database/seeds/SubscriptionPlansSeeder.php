<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        if (config('database.default') === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
        } else {
            DB::statement('SET CONSTRAINTS ALL DEFERRED;');
        }

        DB::table('km8_subscription_plans')->truncate();

        $dateTime =  Carbon::now();

        DB::table('km8_subscription_plans')->insert([
            'name' => 'Free',
            'description' => 'free plan',
            'css_style' => 'background:#FF9500; color: #fff;',
            'base_price' => 0,
            'properties' => null,
            'created_at' => $dateTime,
            'updated_at' => $dateTime,
        ]);

        DB::table('km8_subscription_plans')->insert([
            'name' => 'Standard',
            'description' => 'standard plan',
            'css_style' => 'background:#4CAF50; color: #fff;',
            'base_price' => 10.25,
            'default_grace_period' => 15,
            'properties' => '{ "child_per_day_price": 0.25, "staff_per_day_price": 0.54 }',
            'country_code' => 'AU',
            'created_at' => $dateTime,
            'updated_at' => $dateTime,
        ]);

        DB::table('km8_subscription_plans')->insert([
            'name' => 'Standard',
            'description' => 'standard plan',
            'css_style' => 'background:#4CAF50; color: #fff;',
            'base_price' => 12.50,
            'default_grace_period' => 15,
            'properties' => '{ "child_per_day_price": 0.30, "staff_per_day_price": 0.75 }',
            'country_code' => 'US',
            'created_at' => $dateTime,
            'updated_at' => $dateTime,
        ]);

        DB::table('km8_subscription_plans')->insert([
            'name' => 'Organization',
            'description' => 'advance plan',
            'css_style' => 'background:#009ee8; color: #fff;',
            'default_grace_period' => 15,
            'properties' => null,
            'created_at' => $dateTime,
            'updated_at' => $dateTime,
        ]);

        if (config('database.default') === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        } else {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }
    }
}
