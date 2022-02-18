<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChildDocumentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_documents', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('child_id')->index();     //fk -> child_profile table
            $table->json('documents')->nullable()->default(null);
            $table->string('child_profile_image')->nullable()->default(null);

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
                ->onDelete('cascade');

            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('child_documents');
    }
}
