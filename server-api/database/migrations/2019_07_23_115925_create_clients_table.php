<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateClientsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_organization', function (Blueprint $table)
        {
            $table->bigIncrements('id');

            //required
            $table->string('company_name', 500);
            $table->string('email', 150)->unique();
            $table->string('timezone', 150)->nullable()->default(null);

            //not required
            $table->string('phone_number', 20)->nullable()->default(null);
            $table->string('fax_number', 20)->nullable()->default(null);
            $table->string('address_1', 200)->nullable()->default(null);
            $table->string('address_2', 250)->nullable()->default(null);
            $table->string('zip_code')->nullable()->default(null);
            $table->string('city', 120)->nullable()->default(null);
            $table->string('state',120)->nullable()->default(null);
            $table->string('country_code', 10)->nullable()->default(null);
            $table->unsignedInteger('no_of_branches')->nullable()->default(null);//new
            $table->string('organization_type')->nullable()->default(null);//new
            $table->string('how_did_you_hear', 250)->nullable()->default(null);

            $table->enum('status', array(
                'pending',
                'email_verification',
                'active',
                'quotation_acceptance',
                'suspended',
                'deactivate'
            ))->default('pending');

            // Status for core addon modules
            $table->enum('payment_status', array(
                'pending',
                'on_trial',
                'on_paid',
                'on_payment_failed'
            ))->default('pending');

            $table->integer('grace_period')->nullable()->default(null);
            $table->date('grace_period_end_date')->nullable()->default(null);
            $table->date('subscription_start_date')->nullable()->default(null); // Actual start date of subscription for payment - date will be after trial period if base module has trial period
            $table->integer('tax_percentage')->default(0);
            $table->enum('currency', array('USD','AUD'))->default('AUD');
            $table->string('organization_code')->nullable()->default(null); //ABN Number or Tax file number
            $table->enum('payment_frequency', array(
                // 'fortnightly',
                'monthly',
                'quaterly',
                'annually',
                'manual'
            ));
            $table->enum('subscription_cycle', array('monthly', 'annually'))->default('monthly');
            $table->boolean('email_verified')->default(false);
            $table->string('provider_id', 120)->nullable()->default(null);

            $table->json('preferences')->nullable()->default(null);

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
        Schema::dropIfExists('km8_organization');
    }
}
