<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCcsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_ccs', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id');
            $table->string('activation_code', 20);
            $table->string('device_name', 20);
            $table->string('PRODA_org_id', 20);
            $table->string('person_id', 20);
            $table->string('key_status', 20);
            $table->string('device_status', 20);
            $table->timestamp('key_expire');
            $table->timestamp('device_expire');
            $table->enum('status', [1, 0])->default(0); //check the status active or not
            $table->softDeletes();
            $table->timestamps();

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
        Schema::dropIfExists('ccs');
    }
}
