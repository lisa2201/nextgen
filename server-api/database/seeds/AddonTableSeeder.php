<?php

use Illuminate\Database\Seeder;
use Kinderm8\Addon;

class AddonTableSeeder extends Seeder
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

        DB::table('km8_addons')->truncate();

        $addons = [
            [
                'title' => 'Kinder m8 Base Product',
                'description' => 'Kinder m8 Parent Portal base product',
                'custom' => 0,
                'plugin' => 0,
                'country' => 'AU',
                'imageUrl' => 'assets/images/logos/KMLOGO.png',
                'price' => null,
                'split_pricing' => true,
                'unit_type' => Addon::CHILD_UNIT_TYPE,
                'minimum_price' => 10,
                'trial_period' => 14,
                'properties' => json_encode([
                    'monthly_price' => 12,
                    'annual_price' => 10
                ])
            ],
            [
                'title' => 'Kinder m8 CCS',
                'description' => 'Kinder m8 CCS Product',
                'custom' => 1,
                'plugin' => 0,
                'country' => 'AU',
                'imageUrl' => 'assets/images/logos/KMLOGO.png',
                'price' => 10,
                'split_pricing' => false,
                'minimum_price' => 10,
                'unit_type' => Addon::CHILD_UNIT_TYPE,
                'trial_period' => null
            ],
            [
                'title' => 'Kinder m8 Program Planning',
                'description' => 'Kinder m8 Program Planning Plugin',
                'custom' => 1,
                'plugin' => 1,
                'country' => 'AU',
                'imageUrl' => 'assets/images/logos/KMLOGO.png',
                'price' => 150,
                'split_pricing' => false,
                'unit_type' => Addon::FIXED_UNIT_TYPE
            ]

        ];

        foreach($addons as $addon) {
            Addon::create($addon);
        }

        if (config('database.default') === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        } else {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }

    }
}
