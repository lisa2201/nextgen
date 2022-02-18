<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateQuoteApprovalsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_quote_approvals', function (Blueprint $table)
        {
            $table->increments('id');
            $table->unsignedBigInteger('organization_id')->index();
            // $table->unsignedBigInteger('user_id')->index();
            $table->string('token');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            // $table->foreign('user_id')
            //     ->references('id')
            //     ->on('km8_users')
            //     ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_quote_approvals');
    }
}
