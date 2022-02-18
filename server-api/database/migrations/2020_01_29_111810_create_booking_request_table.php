<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateBookingRequestTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_booking_request', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('room_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('fee_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('booking_id')->index()->nullable()->default(null);

            $table->enum('type', array(0, 1, 2, 3))->default(0); // 0 - casual booking, 1 - normal booking, 2 - absence, 3 - holiday, 4 - late drop off, 5 - late pick up
            $table->enum('request_type', array(0, 1))->default(0); // 0 - mobile app, 1 - enrolment form
            $table->date('start_date');
            $table->date('end_date')->nullable()->default(null); // normal booking -> end date required
            $table->json('morning_days')->nullable()->default(null);
            $table->json('afternoon_days')->nullable()->default(null);
            $table->json('selected_week_days')->nullable()->default(null); // normal booking -> selected_week_days required
            $table->integer('late_time')->nullable()->default(null); // required when for pickup and drop off
            $table->string('late_desc')->nullable()->default(null); // required when for pickup and drop off
            $table->enum('status', array(0, 1, 2))->default(0); // 0 - pending, 1 - confirm, 2 - rejected

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

            $table->foreign('created_by')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->foreign('room_id')
                ->references('id')
                ->on('km8_rooms')
                ->onDelete('cascade');

            $table->foreign('fee_id')
                ->references('id')
                ->on('km8_fees')
                ->onDelete('cascade');

            $table->foreign('booking_id')
                ->references('id')
                ->on('km8_child_bookings')
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
        Schema::dropIfExists('km8_booking_request');
    }
}
