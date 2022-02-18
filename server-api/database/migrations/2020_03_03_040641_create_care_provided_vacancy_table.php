<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCareProvidedVacancyTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_care_provided_vacancy', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->date('week_start')->index();
            $table->json('request')->default(null);
            $table->bigInteger('created_by')->index();
            $table->enum('is_synced', array(0, 1, 2))->default(0); //1 - yes, 0 - no, 2 - error;
            $table->json('syncerror')->nullable()->default(null);
            $table->char('dhscorrelationid', 255)->nullable()->default(null);
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
        Schema::dropIfExists('care_provided_vacancy');
    }
}
