<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildNoLongerAtRiskAccs extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_accs_no_longer_at_risk', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('accs_id');
            $table->date('date_no_longer_at_risk')->nullable();
            $table->json('supporting_docs')->nullable();
            $table->json('api_data')->nullable();
            $table->string('is_synced', 255)->default('0'); //not null default 0
            $table->jsonb('syncerror')->nullable();
            $table->string('dhscorrelationid', 255)->nullable();
            $table->json('response')->nullable(); //not null default 0
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('accs_id')
                ->references('id')
                ->on('km8_child_accs')
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
        Schema::dropIfExists('km8_child_accs_no_longer_at_risk');
    }
}
