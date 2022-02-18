<?php



use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateProviderSetupTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('km8_providers', function (Blueprint $table)
        {
            $table->Increments('id');
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('ccs_setup_id')->index();

            $table->string('provider_id');
            $table->string('buisness_name');
            $table->string('legal_name');

            $table->string('name_type');
            $table->string('entity_type');
            $table->string('ABN');
            $table->string('registration_code');
            $table->date('date_of_event');
            $table->string('mobile')->nullable()->default(null);
            $table->string('email',150)->nullable()->default(null);
            $table->json('address')->nullable()->default(null);
            $table->json('contact')->nullable()->default(null);
            $table->json('financial')->nullable()->default(null);

            $table->enum('is_synced', array(0, 1, 2, 3, 4, 5))->default(0); //1 - yes, 0 - no, 2 - adderror, 3 - nameerror, 4 - finerror, 5 - contacterror;
            $table->json('syncerror')->nullable()->default(null);
            $table->char('dhscorrelationid', 255)->nullable()->default(null);

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('km8_organization')
                ->onDelete('cascade');

            $table->foreign('ccs_setup_id')
                ->references('id')
                ->on('km8_ccs')
                ->onDelete('cascade');
        });
    }

    // ->nullable()->default(null);


    //  * Address
    //  * [
    //  *  {
    //  *      "address_type":"",
    //  *      "address_line":"",
    //  *      "suburb":"",
    //  *      "state":"",
    //  *      "postal_code":"",
    //  *  }
    //  * ]


    /**
     * Services
     * [
     *  {
     *      "services":
     *      "id":"",
     *      "name":"",
     *      "ccs_approval_status" : ""
     *  }
     * ]
     */

    /**
     * [
     *  {
     *      "financial_bsb" : "",
     *      "account_number" : "",
     *      "account_name" : "",
     *  }
     * ]
     */

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('km8_providers');
    }
}
