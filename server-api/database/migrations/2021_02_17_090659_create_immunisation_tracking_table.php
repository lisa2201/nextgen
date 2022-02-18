<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateImmunisationTrackingTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_immunisation_tracking', function (Blueprint $table)
        {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('child_id')->index();
            $table->unsignedBigInteger('immunisation_id')->index();
            $table->unsignedBigInteger('immunisation_schedule_id')->index();
            $table->unsignedBigInteger('created_by')->index();

            $table->date('date')->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->foreign('immunisation_id')
                ->references('id')
                ->on('km8_immunisation')
                ->onDelete('cascade');

            $table->foreign('immunisation_schedule_id')
                ->references('id')
                ->on('km8_immunisation_schedule')
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
        Schema::dropIfExists('km8_immunisation_tracking');
    }
}
