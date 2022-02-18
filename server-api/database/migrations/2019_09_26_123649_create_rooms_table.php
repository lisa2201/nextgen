<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRoomsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_rooms', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('currentgen_id')->index()->nullable()->default(null);
            $table->unsignedBigInteger('created_by')->index();

            $table->string('title');
            $table->string('description', 250);
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            // $table->enum('sleep_time_required', array(0, 1))->default(1); //0 - no, 1 - yes
            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - inactive
            $table->boolean('admin_only')->default(false);
			$table->integer('staff_ratio')->default(1)->nullable();

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
        Schema::dropIfExists('rooms');
    }
}
