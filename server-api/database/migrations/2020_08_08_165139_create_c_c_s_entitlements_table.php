<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCCSEntitlementsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_ccs_entitlements', function (Blueprint $table) {

            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();

            $table->string('enrolment_id', 20);
            $table->date('date');
            $table->double('ccs_percentage');
            $table->double('ccs_withholding_percentage');
            $table->integer('ccs_total_hours'); // per fortnight
            $table->integer('apportioned_hours')->nullable()->default(null); // per fortnight
            $table->double('accs_hourly_rate_cap_increase')->nullable()->default(null); // percentage
            $table->boolean('annual_cap_reached');
            $table->integer('absence_count');
            $table->enum('pre_school_excemption', array('Y', 'N'));
            $table->boolean('ccs_varied')->default(false);
            $table->boolean('absence_varied')->default(false);
            $table->integer('paid_absence');
            $table->integer('unpaid_absence');
            $table->integer('absences_available_no_evidence');

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

        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_ccs_entitlements');
    }
}
