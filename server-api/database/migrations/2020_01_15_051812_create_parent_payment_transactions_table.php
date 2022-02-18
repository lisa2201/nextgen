<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateParentPaymentTransactionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_parent_payment_transactions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('parent_id')->index();
            $table->unsignedBigInteger('child_id')->nullable()->default(null);
            $table->unsignedBigInteger('ref_id')->nullable()->default(null);

            $table->date('date');
            $table->enum('transaction_type', [
                'fee',
                'subsidy_payment',
                'parent_payment',
                'parent_payment_refund',
                'adjustment',
                'account_balance',
                'subsidy_estimate',
                'ccs_payment',
                'accs_payment'
            ]);
            $table->enum('mode', ['credit', 'debit']);
            $table->string('description')->nullable()->default(null);
            $table->double('amount', 8, 2);
            $table->double('running_total', 8, 2);
            $table->unsignedBigInteger('reverse_ref')->nullable()->default(null);
            $table->boolean('reversed')->default(false);
            $table->double('hours')->nullable()->default(null);
            $table->boolean('visible')->default(true);
            $table->date('ccs_posting_date')->nullable()->default(null);

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

            $table->foreign('parent_id')
                ->references('id')
                ->on('km8_users')
                ->onDelete('cascade');

            $table->foreign('child_id')
                ->references('id')
                ->on('km8_child_profile')
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
        Schema::dropIfExists('parent_payment_transactions');
    }
}
