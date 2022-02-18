<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateISCaseClaimSubmissionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_inclusion_support_claim_submissions', function (Blueprint $table) {

            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->string('case_id');
            $table->string('transaction_id')->nullable()->default(null);
            $table->string('case_claim_reference');
            $table->string('hours_claimed');
            $table->string('payment_type');
            $table->string('service_provision');

            $table->date('week_ending');

            $table->json('enrolments')->nullable()->default(null);
            $table->json('week_days')->nullable()->default(null);
            $table->json('is_case')->nullable()->default(null);

            $table->json('response')->nullable()->default(null);

            $table->text('fail_reason')->nullable()->default(null);

            $table->enum('status', [
                'draft',
                'ready_for_submission',
                'submitted',
                'processed',
                'rejected',
                'cancellation_required',
                'cancelled',
                'rejected_late_submission',
                'failed',
                'discarded'
            ]);

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

        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_inclusion_support_claim_submissions');
    }
}
