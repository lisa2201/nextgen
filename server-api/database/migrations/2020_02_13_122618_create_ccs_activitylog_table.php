<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCcsActivitylogTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_ccs_activitylog', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->nullable()->default(null);
            $table->timestamp('date_time')->nullable()->default(null);
            $table->bigInteger('activity_type')->nullable()->default(null);
            $table->json('request_metadata')->nullable()->default(null);
            $table->json('response_metadata')->nullable()->default(null);
            $table->char('job_name', 550)->nullable()->default(null);
            $table->char('dhscorrelationid ', 255)->nullable()->default(null);
            $table->bigInteger('created_by')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch')
                ->onDelete('cascade');

            // $table->foreign('created_by')
            //     ->references('id')
            //     ->on('km8_users')
            //     ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_ccs_activitylog');
    }
}
