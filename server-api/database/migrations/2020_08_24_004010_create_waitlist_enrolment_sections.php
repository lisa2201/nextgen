<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaitlistEnrolmentSections extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_waitlist_enrolment_sections', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('section_name');
            $table->string('section_code');
            $table->enum('mandatory', array('0', '1'))->default('0');// 0 -  not mandatory, 1 -mandatory;
            $table->enum('section_position_static', array('0', '1'))->default('0');// 0 -  not static, 1 -static
            $table->integer('section_order')->nullable()->default(null);
            $table->enum('hide_status', array('0', '1'))->default('0'); // 0 -  not hode, 1 -hide
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_waitlist_enrolment_sections');
    }
}
