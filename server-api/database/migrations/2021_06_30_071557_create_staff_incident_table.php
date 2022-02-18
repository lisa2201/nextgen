<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStaffIncidentTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_staff_incident', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('staff_id')->index();
            $table->date('date');
            $table->integer('time');
            $table->json('person_completing')->nullable()->default(null);
            $table->json('witness_details')->nullable()->default(null);
            $table->json('incident_details')->nullable()->default(null);
            $table->json('notifications')->nullable()->default(null);
            $table->json('followup_requirments')->nullable()->default(null);
            $table->json('supervisors_acknowledgement')->nullable()->default(null);
            $table->text('images')->nullable()->default(null);

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

            $table->foreign('staff_id')
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
        Schema::dropIfExists('km8_staff_incident');
    }
}
