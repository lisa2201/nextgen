<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Kinderm8\Addon;
use Kinderm8\OrganizationSubscription;

class CreateOrganizationSubscriptionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_organization_subscriptions', function (Blueprint $table) {

            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('addon_id')->index();

            $table->string('title')->nullable()->default(null);
            $table->string('description')->nullable()->default(null);
            $table->double('price', 8, 2);
            $table->enum('unit_type', array(
                Addon::CHILD_UNIT_TYPE,
                Addon::EDUCATOR_UNIT_TYPE,
                Addon::BRANCH_UNIT_TYPE,
                Addon::FIXED_UNIT_TYPE,
                Addon::CUSTOM_UNIT_TYPE
            ));
            $table->double('minimum_price', 8, 2)->nullable()->default(null);
            $table->integer('trial_period')->nullable()->default(null);
            $table->date('trial_start_date')->nullable()->default(null);
            $table->date('trial_end_date')->nullable()->default(null);
            $table->date('addon_start_date')->nullable()->default(null);
            $table->date('addon_end_date')->nullable()->default(null); // Some addons can be expired
            $table->date('last_invoice_date')->nullable()->default(null);
            $table->boolean('custom')->default(false);
            $table->boolean('plugin');
            $table->json('properties')->nullable()->default(null);
            $table->enum('status', array(
                OrganizationSubscription::ON_TRIAL_STATUS,
                OrganizationSubscription::ACTIVE_STATUS,
                OrganizationSubscription::INACTIVE_STATUS
            ));

            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('addon_id')
                ->references('id')
                ->on('km8_addons')
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
        Schema::dropIfExists('km8_organization_subscriptions');
    }
}
