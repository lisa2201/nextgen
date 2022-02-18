<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePaymentHistoryTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_payment_history', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('invoice_id')->index();
            $table->unsignedBigInteger('payment_method_id')->index();

            $table->string('payment_ref')->nullable()->default(null);
            // $table->bigInteger('sequence_number')->nullable()->default(null);
            $table->string('transaction_ref')->nullable()->default(null);
            $table->double('amount', 15, 2);
            $table->date('date');

            $table->enum('payment_type', array(
                'auto',
                'manual'
            ));
            $table->json('properties')->nullable()->default(null);

            $table->enum('status', array(
                'scheduled',
                'paid',
                'failed',
                'pending',
                'submitted',
                'rejected_gateway'
            ));

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization');

            $table->foreign('invoice_id')
                ->references('id')
                ->on('km8_invoices');

            $table->foreign('payment_method_id')
                ->references('id')
                ->on('km8_payment_info');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_payment_history');
    }
}
