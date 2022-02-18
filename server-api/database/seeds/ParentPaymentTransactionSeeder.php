<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;
use Kinderm8\Child;

class ParentPaymentTransactionSeeder extends Seeder
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

        DB::table('km8_child_profile')->truncate();

        $datetime = Carbon::now();

        $childId = 1;

        if(Child::all()->count() == 0) {

            $childId = DB::table('km8_child_profile')->insertGetId([
                'organization_id' => 1,
                'branch_id' => 1,
                'created_by' => 2,
                'first_name' => 'Jon',
                'last_name' => 'Snow',
                'gender' => '1',
                'dob' => '2013-02-12',
                'attendance' => json_encode(['monday' => true]),
                'created_at' => $datetime,
                'updated_at' => $datetime
            ]);

        }

        $tran_types = [
            'subsidy_payment',
            'direct_debit_ezidebit',
            'credit_card_ezidebit',
            'fee',
            'adjustment',
            // 'account_balance'
        ];

        $modes = ['credit', 'debit'];

        for ($i = 0; $i <= 19; $i++) {

            $mode = rand(0,1);

            $transaction = null;

            $amount = rand(50, 400);

            if($mode === 0) {
                $transaction = rand(0,2);
            } else {
                $transaction = rand(3,4);
            }

            $runningTotal = 0;

            $last_rec = DB::table('km8_parent_payment_transactions')->where('child_id', $childId)->orderBy('id', 'desc')->limit(1)->get()->first();

            if($last_rec) {

                if($mode == 0) {

                    $runningTotal = $last_rec->running_total - $amount;

                } else {

                    $runningTotal = $last_rec->running_total + $amount;

                }

            } else {

                if ($mode == 0) {

                    $runningTotal = -$amount;
                } else {

                    $runningTotal = $amount;
                }

            }

            DB::table('km8_parent_payment_transactions')->insert([
                'organization_id' => 1,
                'branch_id' => 1,
                'parent_id' => 4,
                'child_id' => rand(1,2),
                'ref_id' => rand(1,50),
                'date' => Carbon::createFromFormat('Y-m-d', '2019-11-02')->addDays($i),
                'transaction_type' => $tran_types[$transaction],
                'mode' => $modes[$mode],
                'amount' => $amount,
                'running_total' => $runningTotal,
                'created_at' => $datetime,
                'updated_at' => $datetime,
            ]);

        }

        if (config('database.default') === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        } else {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }

    }
}
