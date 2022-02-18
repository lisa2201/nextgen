<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateServiceSetupTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_services', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('provider_id')->index();
            $table->string('service_id');
            $table->string('service_type');
            $table->string('service_name');
            $table->date('start_date')->nullable()->default(null);
            $table->date('end_date')->nullable()->default(null);
            $table->string('no_of_weeks')->nullable()->default(null);
            $table->string('service_approvel_status')->nullable()->default(null);
            $table->string('ACECQARegistrationCode')->nullable()->default(null);
            $table->string('ACECQAExemptionReason')->nullable()->default(null);
            $table->string('mobile')->nullable()->default(null);
            $table->json('address')->nullable()->default(null);
            $table->json('contact')->nullable()->default(null);
            $table->json('financial')->nullable()->default(null);
            $table->enum('is_synced', array(0, 1, 2, 3, 4, 5))->default(0); //1 - yes, 0 - no, 2 - adderror, 3 - nameerror, 4 - finerror, 5 - contacterror;
            $table->json('syncerror')->nullable()->default(null);
            $table->char('dhscorrelationid', 255)->nullable()->default(null);
            $table->json('credentials')->nullable()->default(null);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('provider_id')
                ->references('id')
                ->on('km8_providers')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
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
        Schema::dropIfExists('km8_services');
    }
}
