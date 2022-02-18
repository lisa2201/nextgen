<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaitlistEnquiryQuestions extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_waitlist_enquiry_questions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('section_id')->index();
            $table->enum('input_type', array(
                'singeleinput',
                'select',
                'checkbox',
                'radio-group',
                'dropdown',
                'toggle',
                'richTextBox',
                'textbox',
                'textboxArray',
                'signature',
                'date-picker',
                'switch',
                'upload-switch',
                'select-switch',
                'textbox-switch',
                'select-checkbox',
                'select-multiple',
                'text-area',
                'button',
                'email',
            ));
            $table->text('question');
            $table->text('input_placeholder')->nullable();
            $table->string('input_required', 150);
            $table->string('input_name', 150);
            $table->enum('hidden', array('0', '1'))->default('1'); // 0 -  hidden, 1 - not hidden
            $table->string('input_hiddenfield_name', 150);
            $table->string('input_placeholder_name', 150)->nullable();
            $table->enum('input_mandatory', array('0', '1'))->default('0'); // 0 -  mandatory, 1 - not mandatory
            $table->enum('input_mandatory_changeable', array('0', '1'))->default('0'); // 0 -  changeable, 1 - not changeable
            $table->jsonb('types')->nullable();
            $table->string('access_for', 10)->nullable();
            $table->string('status', 10)->nullable();
            $table->string('column_width')->nullable();
            $table->string('column_height')->nullable();
            $table->integer('column_order')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('section_id')
                ->references('id')
                ->on('km8_waitlist_enrolment_sections')
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
        Schema::dropIfExists('km8_waitlist_enquiry_questions');
    }
}
