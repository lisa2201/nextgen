<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVisitorDetailsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_visitor_details', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->string('firstname');
            $table->string('surname');
            $table->string('organization')->nullable();
            $table->unsignedBigInteger('person_to_meet')->index()->nullable();
            $table->string('person_to_meet_custom')->nullable();
            $table->string('reason_for_visit')->nullable();
            $table->string('mobile_number');
            $table->timestamp('sign_in')->index();
            $table->timestamp('sign_out')->nullable();
            $table->text('signature');
            $table->string('visitor_image')->nullable();
            $table->string('temperature')->nullable(); 
            $table->string('check_list')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('branch_id')
                ->references('id')
                ->on('km8_organization_branch')
                ->onDelete('cascade');

            $table->foreign('person_to_meet')
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
        Schema::dropIfExists('km8_visitor_details');
    }
}
