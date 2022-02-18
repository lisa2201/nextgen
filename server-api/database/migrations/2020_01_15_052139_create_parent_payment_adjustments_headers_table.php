<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateParentPaymentAdjustmentsHeadersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_parent_payment_adjustments_headers', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('item_id')->index();

            $table->date('start_date');
            $table->date('end_date')->nullable()->default(null);
            $table->enum('type', ['other_fee', 'discount']);
            $table->double('amount', 8, 2);
            $table->text('comments')->nullable()->default(null);

            $table->enum('frequency', [
                'weekly',
                'monthly'
            ])->nullable()->default(null);

            $table->boolean('recurring')->default(false);
            $table->boolean('scheduled')->default(false);
            $table->boolean('executed')->default(false);
            $table->boolean('reversed')->default(false);

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

            $table->foreign('item_id')
                ->references('id')
                ->on('km8_adjustment_items')
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
        Schema::dropIfExists('parent_payment_adjustments_headers');
    }
}
