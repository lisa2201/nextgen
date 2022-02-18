<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateParentPaymentSchedulesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_parent_payment_schedules', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->enum('payment_frequency', array(
                'weekly',
                'fortnightly',
                'monthly',
                'custom'
            ))->default('weekly');

            $table->enum('billing_term', array(
                'balance',
                'one_week_advance',
                'two_week_advance',
                'three_week_advance',
                'four_week_advance',
                'six_week_advance',
                'one_month_advance',
                'two_month_advance',
                'three_month_advance'
            ))->nullable()->default(null);

            $table->enum('payment_day', array(
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday'
            ))->nullable()->default(null); // Required for weekly & fortnightly

            $table->date('payment_date')->nullable()->default(null); // Required for monthly (Depcrecated)
            $table->date('activation_date')->nullable()->default(null);
            $table->double('amount_limit', 15, 2)->nullable()->default(null);
            $table->double('fixed_amount', 15, 2)->nullable()->default(null); // Overrides running total and amount limit

            $table->date('last_payment_date')->nullable()->default(null);
            $table->date('last_generation_date')->nullable()->default(null);
            $table->date('next_generation_date')->nullable()->default(null);
            $table->date('advanced_generation_end_date')->nullable()->default(null);
            $table->enum('status', array(
                'active',
                'inactive',
                'upcoming',
                'paused'
            ));
            $table->json('edit_history')->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization');

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch');

            $table->foreign('user_id')
                ->references('id')
                ->on('km8_users');

            $table->foreign('created_by')
                ->references('id')
                ->on('km8_users');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_parent_payment_schedules');
    }
}
