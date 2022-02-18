<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateWaitListEnrollmentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_wait_list_enrollments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('branch_id')->index()->nullable()->default(null);
            $table->jsonb('waitlist_info');
            $table->enum('status', array(0, 1, 2, 3))->default(0); //0-waiting 1-enrollment form sent 2-enrolled 3-activated
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_wait_list_enrollments');
    }
}
