<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEmailTypesToUserTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_email_types_to_user', function (Blueprint $table) {
            $table->unsignedBigInteger('email_type_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->boolean('status')->default(true);
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('email_type_id')
                ->references('id')
                ->on('km8_email_types')
                ->onDelete('cascade');

            $table->primary(['email_type_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_email_types_to_user');
    }
}
