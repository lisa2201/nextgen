<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePersonnelServiceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_personnel_service', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->index();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->nullable()->default(null);
            $table->unsignedBigInteger('service_setup_id')->index();
            $table->string('provider_id')->index();
            $table->string('service_id')->index();
            $table->string('first_name', 150);
            $table->string('last_name', 150)->nullable()->default(null);
            $table->string('phone', 150)->nullable()->default(null);
            $table->string('email', 150);
            $table->enum('indentification', array(0, 1))->default(0); // 0 PRODA  1 EXISTING USER
            $table->string('proda_id', 150)->nullable()->default(null);
            $table->string('person_id', 150)->nullable()->default(null);
            $table->string('dob', 150)->nullable()->default(null);
            $table->json('personnel_declaration')->nullable()->default(null);
            $table->json('roles')->nullable()->default(null);
            $table->json('wwcc')->nullable()->default(null);
            $table->json('supporting_documents')->nullable()->default(null);

            $table->enum('is_synced', array(0, 1, 2, 3, 4, 5))->default(0); //1 - yes, 0 - no, 2 - adderror, 3 - nameerror, 4 - finerror, 5 - contacterror;
            $table->json('syncerror')->nullable()->default(null);
            $table->char('dhscorrelationid', 255)->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch')
                ->onDelete('cascade');

            $table->foreign('service_setup_id')
                ->references('id')
                ->on('km8_services')
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
        Schema::dropIfExists('km8_personnel_service');
    }
}
