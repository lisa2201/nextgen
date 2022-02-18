<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateMasterPaymentProvidersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_master_payment_providers', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->string('country_code',10);
            $table->string('name',50);
            $table->json('properties')->nullable()->default(null);
            $table->enum('status', array(0,1))->default(0); // 0 - active, 1 - inactive

            $table->unique(['name', 'country_code']);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_master_payment_providers');
    }
}
