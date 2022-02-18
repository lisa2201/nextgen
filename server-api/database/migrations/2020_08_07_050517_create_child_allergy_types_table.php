<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChildAllergyTypesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_allergy_types', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->unsigned()->nullable()->default(NULL);
            $table->string('name');
            $table->string('short_name')->nullable();
            $table->unsignedBigInteger('created_by')->unsigned()->nullable()->default(NULL);
            $table->integer('order')->nullable()->default(NULL);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('created_by')
                ->references('id')->on('km8_users')
                ->onDelete('cascade');
            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
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
        Schema::dropIfExists('km8_child_allergy_types');
    }
}
