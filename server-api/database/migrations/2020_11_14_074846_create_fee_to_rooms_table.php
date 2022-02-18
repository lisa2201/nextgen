<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFeeToRoomsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_fee_to_rooms', function (Blueprint $table)
        {
            $table->unsignedBigInteger('room_id')->index();
            $table->unsignedBigInteger('fee_id')->index();

            $table->foreign('room_id')
                ->references('id')
                ->on('km8_rooms')
                ->onDelete('cascade');

            $table->foreign('fee_id')
                ->references('id')
                ->on('km8_fees')
                ->onDelete('cascade');

            $table->primary(['fee_id', 'room_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_fee_to_rooms');
    }
}
