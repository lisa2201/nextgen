<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateFeesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_fees', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();

            $table->string('fee_name');
            $table->enum('fee_type', array(0, 1))->default(0); // 0 - routine, 1- casual
            $table->enum('frequency', array(0, 1))->default(0); // 0 - daily, 1- hourly
            $table->float('net_amount');
            $table->float('gross_amount');
            $table->integer('session_start')->nullable()->default(null);
            $table->integer('session_end')->nullable()->default(null);
            $table->enum('vendor_name', array(0, 1))->default(0); // 0 - Australian ccs, 1- none
            $table->enum('adjust', array(0, 1))->default(0);// 0 - not adjust, 1 - adjusted
            $table->enum('visibility', array(0, 1))->default(0);// 0 - public, 1 - admin only
            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - archive

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
        Schema::dropIfExists('km8_fees');
    }
}
