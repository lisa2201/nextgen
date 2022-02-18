<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateBusAttendanceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     * @throws Throwable
     */
    public function up()
    {
        Schema::create('km8_bus_attendance', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();

            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('bus_id')->index();
            $table->unsignedBigInteger('school_id')->index();
            $table->date('date');

            $table->unsignedBigInteger('drop_user')->index()->nullable()->default(null);
            $table->integer('drop_time')->nullable()->default(null);
            $table->text('drop_geo_coordinates')->nullable()->default(null);
            $table->text('drop_signature')->nullable()->default(null);
            $table->unsignedBigInteger('drop_child_note_id')->index()->nullable()->default(null);

            $table->unsignedBigInteger('pick_user')->index()->nullable()->default(null);
            $table->integer('pick_time')->nullable()->default(null);
            $table->text('pick_geo_coordinates')->nullable()->default(null);
            $table->text('pick_signature')->nullable()->default(null);
            $table->unsignedBigInteger('pick_child_note_id')->index()->nullable()->default(null);

            $table->enum('type', array(0, 1))->default(0); // 0 - normal, 1 - absence

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch')
                ->onDelete('cascade');

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->foreign('bus_id')
                ->references('id')
                ->on('km8_bus_list')
                ->onDelete('cascade');

            $table->foreign('school_id')
                ->references('id')
                ->on('km8_school_list')
                ->onDelete('cascade');

            $table->foreign('drop_user')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('pick_user')
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
        Schema::dropIfExists('km8_bus_attendance');
    }
}
