<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_users', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('branch_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('currentgen_id')->index()->nullable()->default(null);
            $table->enum('site_manager', array(0, 1))->default(0); //0 - no, 1-yes
            //required
            $table->string('first_name', 150);
            //
            $table->string('middle_name', 150)->nullable()->default(null);
            //
            $table->string('last_name', 150);
            $table->string('email', 150);
            $table->string('password');
            //
            $table->date('dob')->nullable()->default(null);
            $table->string('phone', 50)->nullable()->default(null);
            $table->string('phone2', 50)->nullable()->default(null);

            $table->string('work_phone', 50)->nullable()->default(null);
            $table->string('work_mobile', 50)->nullable()->default(null);

            $table->string('address_1', 320)->nullable()->default(null);
            $table->string('address_2', 320)->nullable()->default(null);
            $table->unsignedInteger('zip_code')->nullable()->default(null);
            $table->string('city', 120)->nullable()->default(null);
            $table->string('state')->nullable()->default(null);
            $table->string('country_code', 10)->nullable()->default(null);
            //
            $table->string('image')->nullable()->default(null);
            //
            $table->string('second_email', 150)->nullable()->default(null);
            $table->enum('need_sec_email', array(0, 1))->default(0);
            //
            $table->enum('status', array(0, 1))->default(0);
            $table->enum('login_access', array(0, 1))->default(0);
            $table->boolean('first_time_login')->default(true);
            //
            $table->boolean('email_verified')->default(false);
            //
            $table->string('ccs_id', 20)->nullable()->default(null);
            $table->string('pincode', 20)->nullable()->default(null);
            $table->json('kiosk_setup')->nullable()->default(null);
            $table->jsonb('attendance')->nullable()->default(null);

            //for password setup invitation
            $table->timestamp('invitation_date')->nullable();

            $table->rememberToken();
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
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_users');
    }
}
