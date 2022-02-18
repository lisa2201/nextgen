<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateEnquiriesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_enquiries', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('branch_id')->index()->nullable()->default(null);
            $table->jsonb('enquiry_info');
            $table->enum('status', array(0, 1, 3))->default(0); //0-waiting 1-waitlist form sent 3- hide from execution

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
        Schema::dropIfExists('km8_enquiries');
    }
}
