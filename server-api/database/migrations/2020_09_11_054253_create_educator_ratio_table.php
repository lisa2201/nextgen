<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEducatorRatioTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_educator_ratio', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('state', 10);

            $table->string('age_group', 150);
            $table->double('age_start', 150);
            $table->double('age_end', 150);
            $table->string('ratio_display', 150);
            $table->integer('age_order');


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
        Schema::dropIfExists('km8_educator_ratio');
    }
}
