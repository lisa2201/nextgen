<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildCulturalDetails extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_cultural_details', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('child_id')->index();     //fk -> child_profile table

            $table->string('ab_or_tsi')->nullable()->default(null);
            $table->string('cultural_background')->nullable()->default(null);
            $table->string('language')->nullable()->default(null);
            $table->enum('cultural_requirements_chk', array(0, 1))->default(0); //0 - no, 1-yes
            $table->string('cultural_requirements')->nullable()->default(null);
            $table->enum('religious_requirements_chk', array(0, 1))->default(0); //0 - no, 1-yes
            $table->string('religious_requirements')->nullable()->default(null);
           
            $table->softDeletes();
            $table->timestamps();
            
            $table->foreign('child_id')
            ->references('id')
            ->on('km8_child_profile')
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
        Schema::dropIfExists('km8_child_cultural_details');
    }
}
