<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Kinderm8\Addon;

class CreateAddonsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_addons', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->string('title');
            $table->string('description');
            $table->boolean('custom')->default(false);
            $table->boolean('plugin')->default(false);
            $table->string('country', 10)->nullable()->default(null);
            $table->text('imageUrl')->nullable()->default(null);
            $table->double('price', 8, 2)->nullable()->default(null);
            $table->boolean('split_pricing');
            $table->enum('unit_type', array(
                Addon::CHILD_UNIT_TYPE,
                Addon::EDUCATOR_UNIT_TYPE,
                Addon::BRANCH_UNIT_TYPE,
                Addon::FIXED_UNIT_TYPE,
                Addon::CUSTOM_UNIT_TYPE
            ));
            $table->double('minimum_price', 8, 2)->nullable()->default(null);
            $table->integer('trial_period')->nullable()->default(null);
            $table->json('properties')->nullable()->default(null);
            $table->enum('status', array('0', '1'))->default('0'); // 0 - active

            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Properties
     *  {
     *      "monthly_pricing": ""
     *      "annual_pricing": ""
     *  }
     */

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_addons');
    }
}
