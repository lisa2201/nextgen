<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSubscriptionVerifyCodeTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_subscription_verify_code', function (Blueprint $table)
        {
            $table->bigIncrements('id');

            $table->string('code', 50)->unique();
            $table->string('email', 150)->unique();
            $table->text('data')->nullable()->default(null);

            $table->timestamp('expires_at')->nullable();
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
        Schema::dropIfExists('km8_subscription_verify_code');
    }
}
