<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSessionSubmissionTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_session_submission', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('enrolment_id')->index();

            $table->date('session_start_date');
            $table->date('session_end_date');
            $table->date('session_report_date');

            $table->boolean('no_care_provided')->default(false);
            $table->enum('action', array('INIT', 'VARY', 'NOCHG', 'NOCARE'))->default('INIT');
            $table->enum('reason_for_change', array('NONE', 'ADMIN', 'PARDIS', 'GENAMD', 'SECCOR', 'SECOTH', 'RE204C'))->default('NONE');
            $table->string('reason_for_late_change', 1000)->nullable()->default(null);
            $table->string('reason_for_no_change', 1000)->nullable()->default(null);
            $table->string('reason_for_late_withdrawal', 1000)->nullable()->default(null);
            $table->enum('status', array('NONE', 'APPROV', 'DISPTA', 'DISPTB', 'MANUAL', 'NOPROC', 'NOTAPP', 'PROCES', 'RECEIV', 'REPLAC', 'WITHDR', 'WITNAP', 'NOCHAN', 'REVDIS'))->default('NONE');

            $table->json('sessions');

            $table->enum('submission_type', array(0 , 1))->default(0); // 0 - automated, 1 - manual
            $table->json('status_history')->nullable()->default(null);

            $table->string('late_withdraw_reason', 1000)->nullable()->default(null);

            $table->enum('is_synced', array(0, 1, 2))->default(0); //1 - yes, 0 - no, 2 - error;
            $table->json('syncerror')->nullable()->default(null);
            $table->string('dhscorrelationid', 255)->nullable()->default(null);

            $table->timestamp('resubmitted_on')->nullable()->default(null);
            $table->bigInteger('resubmitted_parent')->nullable()->default(null);
            $table->boolean('is_withdrawal_processed')->default(false);

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

            $table->foreign('enrolment_id')
                ->references('id')
                ->on('km8_child_ccs_enrolment')
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
        Schema::dropIfExists('km8_session_submission');
    }
}
