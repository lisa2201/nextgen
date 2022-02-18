<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildEmergencyContacts extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_emergency_contacts', function (Blueprint $table) {
            //
            $table->bigIncrements('id');
            $table->unsignedBigInteger('currentgen_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('child_profile_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('first_name', 150)->nullable()->default(null);
            $table->string('last_name', 150)->nullable()->default(null);
            $table->string('phone', 50)->nullable()->default(null);
            $table->string('phone2', 50)->nullable()->default(null);
            $table->string('address', 500)->nullable()->default(null);
            $table->string('email', 150)->nullable()->default(null);
            $table->string('relationship')->nullable()->default(null);
            $table->longtext('types')->nullable()->default(null);
            $table->longtext('consents')->nullable()->default(null);
            $table->integer('call_order')->nullable()->default(null);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['child_profile_id', 'user_id']);

            $table->foreign('child_profile_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('km8_users')
                ->onUpdate('cascade')
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
        Schema::dropIfExists('km8_child_emergency_contacts');
    }
}
