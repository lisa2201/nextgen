<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildToUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_to_user', function (Blueprint $table)
        {
            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->boolean('primary_contact')->default(false);
            $table->boolean('primary_payer')->default(false);

            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->primary(['child_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_child_to_user');
    }
}
