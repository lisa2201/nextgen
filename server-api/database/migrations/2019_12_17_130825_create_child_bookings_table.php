<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildBookingsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_bookings', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('room_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('fee_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('adjusted_fee_id')->index()->nullable()->default(null);

            $table->date('date');
            $table->enum('day', array('monday','tuesday','wednesday','thursday','friday','saturday','sunday'));

            $table->float('fee_amount');
            $table->integer('session_start');
            $table->integer('session_end');

            $table->boolean('is_casual')->default(false);
            $table->enum('status', array(0, 1, 2, 3))->default(0); // 0 - booked, 1 - attendance, 2 - absence, 3 - holiday
            $table->enum('type', array(0, 1))->default(0); // 0 - normal, 1 - temporary
            $table->enum('absence_reason', array('NONE', 'Z10001', 'Z10002', 'Z10003', 'Z10004', 'Z10005', 'Z10006', 'Z10007', 'Z10008', 'Z10009', 'Z10010', 'Z10011', 'P10001', 'P10002', 'P10003', 'P10004'))->default('NONE');

            $table->timestamp('booking_updated_on')->nullable()->default(null);

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

            $table->foreign('adjusted_fee_id')
                ->references('id')
                ->on('km8_fees_adjusted')
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
        Schema::dropIfExists('km8_child_bookings');
    }
}
