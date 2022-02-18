<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEmailTypesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_email_types', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('type_name', 150)->nullable()->default(null);
            $table->enum('type', array(0, 1, 2, 3, 4)); //0-enquiry , 1-waitlist , 2-enrolment , ......
            $table->jsonb('settings')->nullable()->default(null);
            $table->enum('status', array(0, 1))->default(1);//  0 - inactive, 1 - active,
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
        Schema::dropIfExists('km8_email_types');
    }
}
