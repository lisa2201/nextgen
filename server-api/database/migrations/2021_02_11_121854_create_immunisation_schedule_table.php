<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateImmunisationScheduleTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_immunisation_schedule', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('immunisation_id')->index();
            $table->string('number', 150);
            $table->string('period', 150);
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('immunisation_id')
                ->references('id')
                ->on('km8_immunisation')
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
        Schema::dropIfExists('km8_immunisation_schedule');
    }
}
