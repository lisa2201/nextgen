<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateChildProfileTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_child_profile', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('currentgen_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('created_by')->index();

            //main
            $table->string('first_name', 150);
            $table->string('middle_name', 150)->nullable()->default(null);
            $table->string('last_name', 150);
            $table->enum('gender', array(0, 1))->default(1);// 0 - male, 1 - female
            $table->string('child_description', 500)->nullable()->default(null);

            //date
            $table->date('dob');
            $table->date('join_date')->nullable()->default(null);
            $table->date('enrollment_start_date')->nullable()->default(null);
            $table->date('enrollment_end_date')->nullable()->default(null);
            $table->jsonb('attendance');

            //address
            $table->string('home_address')->nullable()->default(null);
            $table->string('suburb')->nullable()->default(null);
            $table->string('state')->nullable()->default(null);
            $table->string('postalcode')->nullable()->default(null);
            $table->boolean('court_orders')->default(false);

            //image
            $table->bigInteger('media_avatar_id')->unsigned()->index()->nullable()->default(null);
            $table->string('child_profile_image')->nullable()->default(null);

            //additional options
            $table->enum('nappy_option_required', array(0, 1))->default(0);// 1 - active, 0 - inactive
            $table->enum('bottle_feed_option_required', array(0, 1))->default(0);// 1 - active, 0 - inactive

            $table->enum('status', array(0, 1, 2))->default(1);//  0 - inactive, 1 - active, 2 - waitlisted

            $table->boolean('archived')->default(false);

            $table->string('ccs_id', 10)->nullable()->default(null);

            $table->string('legal_first_name', 150)->nullable()->default(null);
            $table->string('legal_last_name', 150)->nullable()->default(null);

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
        Schema::dropIfExists('km8_child_profile');
    }
}
