<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateClientCreditcardInformationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_organization_creditcard', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();

            $table->string('card_type', 50);
            $table->string('card_number', 30);
            $table->text('card_cvv');
            $table->integer('card_expiry_month');
            $table->integer('card_expiry_year');

            $table->enum('status', array(0, 1))->default(0);// 0 - active, 1 - inactive
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
        Schema::dropIfExists('km8_organization_creditcard');
    }
}
