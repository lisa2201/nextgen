<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAlternativePaymentTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_alternative_payment', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('provider_setup_id')->index();
            $table->string('alternativePaymentArrangementID', 20)->nullable()->default(null);
            $table->json('properties')->nullable()->default(null);
            $table->bigInteger('created_by')->index();
            $table->json('supporting_doc')->nullable()->default(null);

            $table->enum('is_synced', array(0, 1, 2))->default(0); //1 - yes, 0 - no, 2 - error
            $table->json('syncerror')->nullable()->default(null);
            $table->char('dhscorrelationid', 255)->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('provider_setup_id')
                ->references('id')
                ->on('km8_providers');

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
        Schema::dropIfExists('km8_alternative_payment');
    }
}