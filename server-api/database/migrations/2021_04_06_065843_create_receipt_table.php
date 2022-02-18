<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReceiptTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_receipt', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('created_by')->index();
            $table->unsignedBigInteger('supplier_id')->index();
            $table->unsignedBigInteger('category_id')->index();

            $table->string('note')->nullable()->default(null);
            $table->string('gst');
            $table->string('cost');
            $table->string('total');
            $table->string('gst_amount');
            $table->date('date');

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

            $table->foreign('supplier_id')
                ->references('id')
                ->on('km8_suppliers')
                ->onDelete('cascade');

            $table->foreign('category_id')
                ->references('id')
                ->on('km8_categories')
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
        Schema::dropIfExists('km8_receipt');
    }
}
