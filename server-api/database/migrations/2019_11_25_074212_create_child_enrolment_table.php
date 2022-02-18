<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildEnrolmentTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_ccs_enrolment', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('parent_id')->index()->nullable()->default(null);

            $table->string('service_id', 10)->nullable()->default(null);
            $table->string('occurrence_number', 5)->nullable()->default(null);
            $table->string('enrolment_id', 20)->nullable()->default(null);
            $table->enum('status', array('APPROV','CEASED','CONFIR','DISPUT','MANUAL','NOTAPP','PENDEL','PENDIN','RECEIV','REJECT','WITHDR','NONE', 'RE_ENROL'))->nullable()->default('NONE');

            $table->date('enrollment_start_date')->nullable()->default(null); //YYYY-MM-DD
            $table->date('enrollment_end_date')->nullable()->default(null);

            $table->json('session_routine');
            $table->json('initial_session_routine')->nullable()->default(null);

            $table->string('late_submission_reason', 1000)->nullable()->default(null);

            $table->enum('arrangement_type', array('CWA', 'RA', 'ACCS', 'OA', 'PEA'));
            $table->string('arrangement_type_note', 50)->nullable()->default(null);

            $table->enum('session_type', array('R', 'C', 'B')); // R - routine, C - casual, B - both
            $table->boolean('session_type_state')->default(false);

            $table->enum('signing_party', array(0, 1))->default(0);
            $table->string('signing_party_individual_first_name', 150)->nullable()->default(null);
            $table->string('signing_party_individual_last_name', 150)->nullable()->default(null);

            $table->integer('number_weeks_cycle')->nullable();
            $table->text('is_case_details')->nullable()->default(null);
            $table->text('notes')->nullable()->default(null);

            $table->enum('reason_for_pea', array('NONE', 'NOCARE', 'FOSKIN'))->default('NONE');

            $table->json('status_history')->nullable()->default(null);

            $table->enum('parent_status', array(0, 1, 2))->default(0); // 0 - skip, 1 - not confirmed, 2 - confirmed
            $table->json('parent_confirm_details')->nullable()->default(null);

            $table->enum('is_synced', array(0, 1, 2))->default(0); //1 - yes, 0 - no, 2 - error;
            $table->json('syncerror')->nullable()->default(null);
            $table->string('dhscorrelationid', 255)->nullable()->default(null);

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

            $table->foreign('parent_id')
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
        Schema::dropIfExists('km8_child_ccs_enrolment');
    }
}
