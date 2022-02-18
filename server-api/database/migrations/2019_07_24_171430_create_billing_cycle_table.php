<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateBillingCycleTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_billing_cycles', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();

            $table->date('start_date');
            $table->date('end_date');
            $table->bigInteger('child_count')->nullable()->default(null);
            $table->bigInteger('staff_count')->nullable()->default(null);
            $table->bigInteger('user_count')->nullable()->default(null);
            $table->bigInteger('branch_count')->nullable()->default(null);
            $table->json('properties')->nullable()->default(NULL);
            $table->enum('status', array(0,1))->default(0);

            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_billing_cycles');
    }
}
