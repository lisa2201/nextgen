<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaitlistEnrolmentNotes extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_waitlist_enrolment_notes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('enquiry_waitlist_enrolment_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('child_id')->index()->nullable()->default(null);
            $table->enum('type', array('0', '1', '2'))->default('2');// 0=enquiry / waitlist=1 / enrolment=2
            $table->text('note')->index()->nullable()->default(null);
            $table->unsignedBigInteger('created_by')->index();
            $table->unsignedBigInteger('updated_by')->index()->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('created_by')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('updated_by')
                ->references('id')
                ->on('km8_users')
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
        Schema::dropIfExists('km8_waitlist_enrolment_notes');
    }
}
