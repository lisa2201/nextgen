<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateInvoiceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_invoices', function (Blueprint $table)
        {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            // $table->unsignedBigInteger('billing_cycle_id')->index();

            $table->date('start_date');
            $table->date('end_date');
            // $table->bigInteger('child_count')->nullable()->default(null);
            // $table->bigInteger('staff_count')->nullable()->default(null);
            // $table->bigInteger('user_count')->nullable()->default(null);
            // $table->bigInteger('branch_count')->nullable()->default(null);

            $table->string('number')->nullable()->default(null);
            $table->bigInteger('sequence_number')->nullable()->default(null);
            $table->date('due_date');
            $table->enum('status', array(
                'paid',
                'failed',
                'pending',
                'past_due',
                'scheduled',
                'submitted',
                'rejected_gateway'
            ))->default('pending');
            $table->float('subtotal',15,2)->nullable()->default(null);
            $table->smallInteger('attempt_count')->nullable()->default(null);
            $table->date('last_attempted_date')->nullable()->default(null);
            $table->enum('generated_method', ['auto', 'manual']);
            $table->json('properties')->nullable()->default(null);

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization');

            // $table->foreign('billing_cycle_id')
            //     ->references('id')
            //     ->on('km8_billing_cycles');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_invoices');
    }
}
