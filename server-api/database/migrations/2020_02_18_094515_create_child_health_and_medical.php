<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildHealthAndMedical extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_health_and_medical', function (Blueprint $table) {
    
            $table->bigIncrements('id');
            $table->unsignedBigInteger('child_id')->index();     //fk -> child_profile table

            $table->string('ref_no')->nullable()->default(null);
            $table->date('medicare_expiry_date')->nullable()->default(null);
            $table->string('ambulance_cover_no')->nullable()->default(null);
            $table->string('health_center')->nullable()->default(null);
            $table->string('service_name')->nullable()->default(null);
            $table->string('service_phone_no')->nullable()->default(null);
            $table->string('service_address')->nullable()->default(null);
           
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
        Schema::dropIfExists('km8_child_health_and_medical');
    }
}
