<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRoomCapacityTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_room_capacity', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('room_id')->index();
            $table->enum('status', array(0, 1))->default(0);// 0 - inactive, 1 - active
            $table->integer('capacity');
            $table->date('effective_date');
            $table->unsignedBigInteger('created_by')->index();

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('room_id')
                ->references('id')
                ->on('km8_rooms')
                ->onDelete('cascade');
            $table->foreign('created_by')
                ->references('id')
                ->on('km8_users')
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
        Schema::dropIfExists('room_capacity');
    }
}
