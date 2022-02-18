<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Kinderm8\Addon;

class CreateInvoiceItemsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_invoice_items', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('invoice_id')->index();
            $table->unsignedBigInteger('subscription_id')->index();

            $table->string('name')->nullable()->default(null);
            $table->string('description')->nullable()->default(null);
            $table->float('price',15,2)->nullable()->default(null);
            $table->bigInteger('quantity')->nullable()->default(null);
            $table->enum('unit', array(
                Addon::CHILD_UNIT_TYPE,
                Addon::EDUCATOR_UNIT_TYPE,
                Addon::BRANCH_UNIT_TYPE,
                Addon::FIXED_UNIT_TYPE,
                Addon::CUSTOM_UNIT_TYPE
            ))->nullable()->default('child');
            $table->float('subtotal', 15, 2)->nullable()->default(null);

            $table->json('properties')->nullable()->default(null);
            $table->enum('status', array(0,1))->default(0); // 0 - active, 1 - inactive

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('invoice_id')
                ->references('id')
                ->on('km8_invoices')
                ->onDelete('cascade');

            $table->foreign('subscription_id')
                ->references('id')
                ->on('km8_organization_subscriptions');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_invoice_items');
    }
}
