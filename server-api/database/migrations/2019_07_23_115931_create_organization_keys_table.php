<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateOrganizationKeysTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_organization_keys', function (Blueprint $table)
        {
            $table->bigIncrements('id')->index();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('ccs_setup_id')->index();
            $table->string('assertiontoken', 1275)->nullable()->default(null);
            $table->string('bearertoken', 1275)->nullable()->default(null);
            $table->timestamp('bearerexpiredate')->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('ccs_setup_id')
                ->references('id')
                ->on('km8_ccs')
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
        Schema::dropIfExists('km8_organization_keys');
    }
}
