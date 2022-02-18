<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateStaffAttendanceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     * @throws Throwable
     */
    public function up()
    {
        Schema::create('km8_staff_attendance', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('currentgen_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('staff_id')->index();
            $table->enum('checkin_type', array('centre','room','activity'))->default('centre');
            $table->timestamp('checkin_datetime');
            $table->timestamp('checkout_datetime')->nullable()->default(null);
            $table->unsignedBigInteger('checkin_to_id')->index()->default('0');
            $table->unsignedBigInteger('created_user_id')->index()->nullable()->default(null);

            $table->date('old_checkin')->nullable()->default(null);
            $table->date('old_checkout')->nullable()->default(null);

            $table->text('checkin_signature')->nullable()->default(null);

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

            $table->foreign('staff_id')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('created_user_id')
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
        Schema::dropIfExists('km8_staff_attendance');
    }
}
