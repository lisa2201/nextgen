<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateParentPaymentStatementsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_parent_payment_statements', function (Blueprint $table) {

            $table->bigIncrements('id');

            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('parent_id')->index();

            $table->date('start_date');
            $table->date('end_date');
            $table->date('payment_date');
            $table->double('amount')->default(0);
            $table->text('link')->nullable()->default(null);
            $table->enum('generation_method', ['auto', 'manual']);
            $table->json('properties')->nullable()->default(null);

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
        Schema::dropIfExists('km8_parent_payment_statements');
    }
}
