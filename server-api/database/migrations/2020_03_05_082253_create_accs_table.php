<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAccsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_accs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('certificate_or_determination_id',255)->nullable();
            $table->unsignedBigInteger('child_profile_id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->string('type',255)->nullable();
            $table->jsonb('certificate_or_determination_api_data')->nullable();
            $table->jsonb('state_territory_data')->nullable();
            $table->string('is_synced', 255)->default('0'); //not null default 0
            $table->jsonb('syncerror')->nullable();
            $table->string('dhscorrelationid', 255)->nullable();
            $table->string('cancel_reason', 1000)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('child_profile_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');
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
        Schema::dropIfExists('km8_child_accs');
    }
}
