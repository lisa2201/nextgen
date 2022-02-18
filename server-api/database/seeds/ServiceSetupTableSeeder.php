<?php

use Illuminate\Database\Seeder;
use Kinderm8\ServiceSetup;

class ServiceSetupTableSeeder extends Seeder
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

         DB::table('service')->truncate();

        $service =[
            [

              'address' => json_encode([
                [
                  'type' =>  "ZPOSTAL",
                  'streetline1' =>  "Weeden Drive - updated",
                  'streetline2' =>  "",
                  'suburb' =>  "VERMONT SOUTH",
                  'postcode' => "3133",
                  'state' => "VIC",
               ],
               [
                'type' => "ZPHYSICAL",
                'streetline1' =>  "Weeden Drive",
                'streetline2' =>  "Weeden Heights Primary School Council",
                'suburb' =>  "VERMONT SOUTH",
                'postcode' =>  "3133",
                'state' => "VIC"
              ],
            ]),




                'financial' => json_encode([
                [
                'financial_BSB' => '56423',
                'account_number' => '24542122',
                'account_name' => 'christian',


                ],
                [
                  'financial_BSB' => '56423',
                  'account_number' => '24542122',
                  'account_name' => 'christian',
                ],
                [
                  'financial_BSB' => '56423',
                  'account_number' => '24542122',
                  'account_name' => 'christian',
                ]
              ]),




              'contact' => json_encode([
                [
                'date' => '11.05.2019',
                'email' => 'provider@gmail.com',
                'phone' => '945236879',
                'mobile' => '123489555',


                ],
                [
                    'date' => '11.05.2019',
                    'email' => 'provider@gmail.com',
                    'phone' => '945236879',
                    'mobile' => '123489555',
                ],

              ]),

              'services' => json_encode([
                [
                  'services' => 3,
                  'service_id' =>'5555541',
                  'service_name' =>'happy babies',
                  'ccs approval status' => 'CURR'
                ],
                [
                  'services' => 3,
                  'service_id' =>'5555541',
                  'service_name' =>'happy babies',
                  'ccs approval status' => 'CURR'
                ],
                [
                  'services' => 3,
                  'service_id' =>'5555541',
                  'service_name' =>'happy babies',
                  'ccs approval status' => 'CURR'
                ]
              ])
            ]
        ];

        foreach ($service as $service)
        {
            Service::create($service);
        }

        if (config('database.default') === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        } else {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }
    }


}
