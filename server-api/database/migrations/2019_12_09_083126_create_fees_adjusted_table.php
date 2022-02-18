<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateFeesAdjustedTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_fees_adjusted', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('fee_id')->index();
            $table->unsignedBigInteger('created_by')->index()->nullable()->default(null);

            // $table->string('fee_name');
            $table->float('net_amount');
            $table->float('gross_amount');
            $table->date('effective_date')->nullable()->default(null);
            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - archive
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('fee_id')
                ->references('id')
                ->on('km8_fees')
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
        Schema::dropIfExists('km8_fees_adjusted');
    }
}
