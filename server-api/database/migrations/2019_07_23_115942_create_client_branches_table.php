<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateClientBranchesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_organization_branch', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index()->nullable()->default(null);
            //required
            $table->string('subdomain_name', 120)->unique();
            $table->string('name', 250)->unique();
            $table->string('timezone', 150);
            //not required
            $table->string('email', 150)->nullable()->default(null);
            $table->string('description', 500)->nullable()->default(null);
            $table->string('phone_number', 20)->nullable()->default(null);
            $table->string('fax_number', 20)->nullable()->default(null);
            $table->string('address_1', 200)->nullable()->default(null);
            $table->string('address_2', 250)->nullable()->default(null);
            $table->unsignedInteger('zip_code')->nullable()->default(null);
            $table->string('city', 120)->nullable()->default(null);
            $table->string('country_code', 10)->nullable()->default(null);
            //
            $table->unsignedBigInteger('media_logo_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('media_cover_id')->index()->nullable()->default(null);
            //
            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - inactive
            $table->unsignedBigInteger('service_id')->nullable()->default(null);
            $table->json('opening_hours')->nullable()->default(null);
            $table->json('center_settings')->nullable()->default(null);
            $table->boolean('kinderconnect')->default(false);
            $table->string('pincode', 20)->nullable()->default(null);
            $table->date('start_date')->nullable()->default(null);
            $table->string('branch_logo', 500)->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('service_id')
                ->references('id')
                ->on('km8_services');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_organization_branch');
    }
}
