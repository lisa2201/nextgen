<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSubscriptionPlansTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_subscription_plans', function (Blueprint $table) 
        {
            $table->increments('id');
            $table->string('name');
            $table->string('description');
            $table->string('css_style');
            $table->double('base_price', 15, 2)->nullable()->default(null);
            $table->integer('default_grace_period')->nullable()->default(null);
            $table->json('properties')->nullable()->default(null);
            $table->string('country_code', 10)->nullable()->default(null);
            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - inactive
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
        Schema::dropIfExists('km8_subscription_plans');
    }
}
