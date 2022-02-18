<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildAllergies extends Migration
{
       /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_allergies', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('child_id')->index();     //fk -> child_profile table

            $table->string('allergy_type')->nullable()->default(null);
            $table->string('description')->nullable()->default(null);
           
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
        Schema::dropIfExists('km8_child_allergies');
    }
}
