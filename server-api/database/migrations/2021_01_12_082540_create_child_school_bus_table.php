<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChildSchoolBusTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_school_bus', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('bus_id')->index()->nullable()->default(NULL);
            $table->unsignedBigInteger('school_id')->index()->nullable()->default(NULL);
            $table->unsignedBigInteger('child_id')->index();

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('bus_id')
                ->references('id')
                ->on('km8_bus_list')
                ->onDelete('cascade');
            $table->foreign('school_id')
                ->references('id')
                ->on('km8_school_list')
                ->onDelete('cascade');
            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
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
        Schema::dropIfExists('child_school_bus');
    }
}
