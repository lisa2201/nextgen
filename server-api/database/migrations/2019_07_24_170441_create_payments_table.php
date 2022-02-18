<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePaymentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_payment_info', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->enum('payment_type', array(
                'stripe',
                'ezidebit',
                'manual'
            ));

            $table->string('ref_id')->nullable()->default(null);
            $table->json('properties')->nullable()->default(null);

            $table->string('first_name')->nullable()->default(null);
            $table->string('last_name')->nullable()->default(null);
            $table->string('phone', 20)->nullable()->default(null);
            $table->string('address1', 200)->nullable()->default(null);
            $table->string('address2', 250)->nullable()->default(null);
            $table->string('zip_code')->nullable()->default(null);
            $table->string('city', 120)->nullable()->default(null);
            $table->string('state', 120)->nullable()->default(null);
            $table->string('country_code', 10)->nullable()->default(null);

            $table->enum('mode', array(
                'card',
                'bank'
            ))->nullable()->default(null);
            $table->string('last4')->nullable()->default(null);
            $table->tinyInteger('exp_month')->nullable()->default(null);
            $table->smallInteger('exp_year')->nullable()->default(null);

            $table->enum('status', array(0, 1))->default(0); // 0 - active
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_payment_info');
    }
}
