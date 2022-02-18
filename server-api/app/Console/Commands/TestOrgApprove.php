<?php

namespace Kinderm8\Console\Commands;

use DB;
use Illuminate\Console\Command;
use Kinderm8\Addon;
use Kinderm8\Enums\StatusType;
use Kinderm8\Organization;
use Kinderm8\OrganizationSubscription;
use Kinderm8\Role;
use Kinderm8\User;
use TempRolesForOrgAdminSeeder;

class TestOrgApprove extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'command:test-org-approve';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'testing purpose';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        try
        {
            DB::beginTransaction();

            /*DB::table('oauth_clients')->insert([
                'id' => 1,
                'user_id' => null,
                'name' => 'Kinderm8 Personal Access Client',
                'secret' => 'xaO8qVN0IKg8NtZuQw103PiGFFOhbybgB3deEr4U',
                'redirect' => 'http://localhost',
                'personal_access_client' => true,
                'password_client' => false,
                'revoked' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            DB::table('oauth_clients')->insert([
                'id' => 2,
                'user_id' => null,
                'name' => 'Kinderm8 Password Grant Client',
                'secret' => 'fxRXel57X084jHFp7whvNE3NtWZuwT2R5IDc0u5y',
                'redirect' => 'http://localhost',
                'personal_access_client' => false,
                'password_client' => true,
                'revoked' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            $this->info('passport clients added done');*/

            $orgId = DB::table('km8_organization')->insertGetId([
                'company_name' => 'reny',
                'email' => 'reny@proitzen.com',
                'timezone' => 'Australia/NSW',
                'address_1' => 'No.432, Boulavard Street',
                'address_2' => 'Manor Park',
                'city' => 'Sydney',
                'state' => 'New South Wales',
                'zip_code' => '3000',
                'country_code'  => 'AU',
                'status'  => 'active',
                'payment_status'  => 'on_trial',
                'grace_period'  => '15',
                'subscription_start_date' => '2019-09-10',
                'tax_percentage'  => '10',
                'currency' => 'AUD',
                'organization_code' => '212313131',
                'email_verified' => '1',
                'provider_id' =>'190009003H',
                'payment_frequency' => 'monthly',
                'created_at' => '2018-08-27 10:11:32',
                'updated_at' => '2018-08-27 10:15:17'
            ]);

            $this->info('org added done');

            DB::table('km8_users')->insert([
                'organization_id' => $orgId,
                'site_manager' => '1',
                'email' => 'reny@km8.com',
                'password' => '$2y$10$Qi2GgW2VMOmD1bVeKxYqB.f.SnBLFr9QjGAKH0Foz95JqZUVVoUui',
                'first_name' => 'reny',
                'last_name' => 'leonard',
                'second_email' => '0',
                'need_sec_email' => '0',
                'status' => '0',
                'login_access' => '0',
                'email_verified' => '1',
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            $this->info('user added done');

            $org = Organization::findOrFail($orgId);

            $org->payment_status = StatusType::PAY_TRIAL;
            $org->status = StatusType::ACTIVE;
            $org->save();

            $userAccount = User::findOrFail($org->user->id);

            /*--------------------------------------------------*/
            /* create temp user and roles */
            /*--------------------------------------------------*/

            //attach branch admin & org admin to user - site owner
            $userAccount->syncRoles(Role::whereIn('name', ['org-admin-', 'portal-org-admin'])->get());

            //create temp user roles [ branch-admin, staff, parent ]
            $roleSeeder = new TempRolesForOrgAdminSeeder();
            $roleSeeder->run($org->id);

            /*--------------------------------------------------*/
            /* create organization subscription */
            /*--------------------------------------------------*/

            if (Addon::all()->count() === 0) {

                DB::table('km8_addons')->insert([
                    'title' => 'Kinder m8 Parent Portal',
                    'description' => 'Kinder m8 Parent Portal base product',
                    'custom' => 0,
                    'plugin' => 0,
                    'country' => 'AU',
                    'imageUrl' => null,
                    'price' => 200,
                    'unit_type' => Addon::FIXED_UNIT_TYPE,
                    'trial_period' => 30,
                    'created_at' => '2018-08-27 10:11:33',
                    'updated_at' => '2018-08-27 10:11:33',
                ]);

                $this->info('addon added done');
            }

            DB::table('km8_organization_subscriptions')->insert([
                'organization_id' => $orgId,
                'addon_id' => 1,
                'title' => 'Kinder m8 Parent Portal',
                'description' => 'Kinder m8 Parent Portal base product',
                'price' => 2,
                'unit_type' => Addon::CHILD_UNIT_TYPE,
                'minimum_price' => 10,
                'plugin' => false,
                'addon_start_date' => '2019-05-01',
                'status' => OrganizationSubscription::ACTIVE_STATUS,
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            DB::table('km8_organization_subscriptions')->insert([
                'organization_id' => $orgId,
                'addon_id' => 3,
                'title' => 'Kinder m8 Program Planning Plugin',
                'description' => 'Kinder m8 Program Planning Plugin',
                'price' => 150,
                'unit_type' => Addon::FIXED_UNIT_TYPE,
                'plugin' => true,
                'addon_start_date' => '2019-06-01',
                'status' => OrganizationSubscription::ACTIVE_STATUS,
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            $this->info('organization subscription added done');

            /*
            DB::table('km8_providers')->insert([
                'organization_id' => $orgId,
                'provider_id' => '190009003H',
                'buisness_name' => 'Kinderm8',
                'legal_name' => 'Kinderm8',
                'name_type' => 'Name Type',
                'entity_type' => 'Entity',
                'ABN' => '23423454543',
                'registration_code' => '23455442',
                'date_of_event' => '2019-09-20',
                'mobile' => '4546564545',
                'email' => 'sample@gmail.com',
                'address' => json_encode([
                    [
                        'type' =>  "ZPOSTAL",
                        'streetLine1' =>  "Weeden Drive",
                        'streetLine2' =>  "Drive",
                        'suburb' =>  "VERMONT SOUTH",
                        'postcode' => "3133",
                        'state' => "VIC",
                    ],
                    [
                        'type' => "ZPHYSICAL",
                        'streetLine1' =>  "Main Ave",
                        'streetLine2' =>  "45",
                        'suburb' =>  "Costa",
                        'postcode' =>  "4332",
                        'state' => "NSW"
                    ],
                ]),
                'financial' => json_encode([
                    [
                        'financial_BSB' => "56423",
                        'account_number' =>  "24542122",
                        'account_name' =>  "christian",
                    ],
                    [
                        'financial_BSB' => "42342",
                        'account_number' =>  "557567567",
                        'account_name' =>  "horner",
                    ],
                ]),
                'contact' => json_encode([
                    [
                        'date' => '11.05.2019',
                        'email' => 'provider@gmail.com',
                        'phone' => '945236879',
                        'mobile' => '123489555',
                    ],
                    [
                        'date' => '11.05.2019',
                        'email' => 'provider@gmail.com',
                        'phone' => '945236879',
                        'mobile' => '123489555',
                    ],
                ]),
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            $this->info('provider added done');

            DB::table('km8_services')->insert([
                'organization_id' => $orgId,
                'provider_id' => 1,
                'service_id' => '190012455K',
                'service_type' => 'test',
                'service_name' => 'test service',
                'start_date' => '2019-12-01',
                'end_date' => '2019-12-01',
                'no_of_weeks' => '3',
                'ACECQARegistrationCode' => '0000000215H',
                'ACECQAExemptionReason' => '0002111H',
                'service_approvel_status' => '0',
                'mobile' => '4546564545',
                'address' => json_encode([
                    [
                        'type' =>  "ZPOSTAL",
                        'streetline1' =>  "Weeden Drive",
                        'streetline2' =>  "Drive",
                        'suburb' =>  "VERMONT SOUTH",
                        'postcode' => "3133",
                        'state' => "VIC",
                    ],
                    [
                        'type' => "ZPHYSICAL",
                        'streetline1' =>  "Main Ave",
                        'streetline2' =>  "45",
                        'suburb' =>  "Costa",
                        'postcode' =>  "4332",
                        'state' => "NSW"
                    ],
                ]),
                'financial' => json_encode([
                    [
                        'financial_BSB' => "56423",
                        'account_number' =>  "24542122",
                        'account_name' =>  "test account",
                    ],
                    [
                        'financial_BSB' => "42342",
                        'account_number' =>  "557567567",
                        'account_name' =>  "test 2 account",
                    ],
                ]),
                'contact' => json_encode([
                    [
                        'date' => '11.05.2019',
                        'email' => 'testservice@gmail.com',
                        'phone' => '945236879',
                        'mobile' => '123489555',
                    ],
                    [
                        'date' => '11.05.2019',
                        'email' => 'testservice@gmail.com',
                        'phone' => '945236879',
                        'mobile' => '123489555',
                    ],
                ]),
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            $this->info('service added done');

            //create branches
            DB::table('km8_organization_branch')->insert([
                'organization_id' => 1,
                'subdomain_name' => 'ccmstest',
                'name' => 'ccmstest',
                'timezone' => 'Australia/NSW',
                'email' => 'ccmstest@km8.com',
                'description' => 'ccmstest branch',
                'phone_number' => '0777758198',
                'fax_number' => '0777758198',
                'address_1' => 'Colombo',
                'address_2' => 'Srilanka',
                'zip_code' => '03455',
                'city' => NULL,
                'country_code' =>'AU',
                'media_logo_id' => NULL,
                'media_cover_id' => NULL,
                'status' => '0',
                'service_id' => 1,
                'opening_hours' => json_encode(json_decode("[{\"index\":0,\"disable\":true,\"value\":[540,1080]},{\"index\":1,\"disable\":false,\"value\":[540,1080]},{\"index\":2,\"disable\":false,\"value\":[540,1080]},{\"index\":3,\"disable\":false,\"value\":[540,1080]},{\"index\":4,\"disable\":false,\"value\":[540,1080]},{\"index\":5,\"disable\":false,\"value\":[540,1080]},{\"index\":6,\"disable\":true,\"value\":[540,1080]}]")),
                'deleted_at' => NULL,
                'created_at' =>'2019-10-10 07:23:01',
                'updated_at' => '2019-10-10 07:23:01'
            ]);

            DB::table('km8_organization_branch')->insert([
                'organization_id' => 1,
                'subdomain_name' => 'bbc',
                'name' => 'bbc',
                'timezone' => 'Australia/NSW',
                'email' => 'bbc@km8.com',
                'description' => 'bbc branch',
                'phone_number' => '0777758198',
                'fax_number' => '0777758198',
                'address_1' => 'Colombo',
                'address_2' => 'Srilanka',
                'zip_code' => '03455',
                'city' => NULL,
                'country_code' =>'AU',
                'media_logo_id' => NULL,
                'media_cover_id' => NULL,
                'status' => '0',
                'service_id' => 1,
                'opening_hours' => json_encode(json_decode("[{\"index\":0,\"disable\":true,\"value\":[540,1080]},{\"index\":1,\"disable\":false,\"value\":[540,1080]},{\"index\":2,\"disable\":false,\"value\":[540,1080]},{\"index\":3,\"disable\":false,\"value\":[540,1080]},{\"index\":4,\"disable\":false,\"value\":[540,1080]},{\"index\":5,\"disable\":false,\"value\":[540,1080]},{\"index\":6,\"disable\":true,\"value\":[540,1080]}]")),
                'deleted_at' => NULL,
                'created_at' =>'2019-10-10 07:23:01',
                'updated_at' => '2019-10-10 07:23:01'
            ]);

            DB::table('km8_organization_branch')->insert([
                'organization_id' => 1,
                'subdomain_name' => 'aab',
                'name' => 'aab',
                'timezone' => 'Australia/NSW',
                'email' => 'aab@km8.com',
                'description' => 'aab branch',
                'phone_number' => '0777758198',
                'fax_number' => '0777758198',
                'address_1' => 'Colombo',
                'address_2' => 'Srilanka',
                'zip_code' => '03455',
                'city' => NULL,
                'country_code' =>'AU',
                'media_logo_id' => NULL,
                'media_cover_id' => NULL,
                'status' => '0',
                'service_id' => 1,
                'opening_hours' => json_encode(json_decode("[{\"index\":0,\"disable\":true,\"value\":[540,1080]},{\"index\":1,\"disable\":false,\"value\":[540,1080]},{\"index\":2,\"disable\":false,\"value\":[540,1080]},{\"index\":3,\"disable\":false,\"value\":[540,1080]},{\"index\":4,\"disable\":false,\"value\":[540,1080]},{\"index\":5,\"disable\":false,\"value\":[540,1080]},{\"index\":6,\"disable\":true,\"value\":[540,1080]}]")),
                'deleted_at' => NULL,
                'created_at' =>'2019-10-10 07:23:01',
                'updated_at' => '2019-10-10 07:23:01'
            ]);

            DB::table('km8_organization_branch')->insert([
                'organization_id' => 1,
                'subdomain_name' => 'km8',
                'name' => 'km8',
                'timezone' => 'Australia/NSW',
                'email' => 'km8@km8.com',
                'description' => 'km8 branch',
                'phone_number' => '0777758198',
                'fax_number' => '0777758198',
                'address_1' => 'Colombo',
                'address_2' => 'Srilanka',
                'zip_code' => '03455',
                'city' => NULL,
                'country_code' =>'AU',
                'media_logo_id' => NULL,
                'media_cover_id' => NULL,
                'status' => '0',
                'service_id' => 1,
                'opening_hours' => json_encode(json_decode("[{\"index\":0,\"disable\":true,\"value\":[540,1080]},{\"index\":1,\"disable\":false,\"value\":[540,1080]},{\"index\":2,\"disable\":false,\"value\":[540,1080]},{\"index\":3,\"disable\":false,\"value\":[540,1080]},{\"index\":4,\"disable\":false,\"value\":[540,1080]},{\"index\":5,\"disable\":false,\"value\":[540,1080]},{\"index\":6,\"disable\":true,\"value\":[540,1080]}]")),
                'deleted_at' => NULL,
                'created_at' =>'2019-10-10 07:23:01',
                'updated_at' => '2019-10-10 07:23:01'
            ]);

            DB::table('km8_organization_branch')->insert([
                'organization_id' => 1,
                'subdomain_name' => 'test',
                'name' => 'test',
                'timezone' => 'Australia/NSW',
                'email' => 'test@km8.com',
                'description' => 'test branch',
                'phone_number' => '0777758198',
                'fax_number' => '0777758198',
                'address_1' => 'Colombo',
                'address_2' => 'Srilanka',
                'zip_code' => '03455',
                'city' => NULL,
                'country_code' =>'AU',
                'media_logo_id' => NULL,
                'media_cover_id' => NULL,
                'status' => '0',
                'service_id' => 1,
                'opening_hours' => json_encode(json_decode("[{\"index\":0,\"disable\":true,\"value\":[540,1080]},{\"index\":1,\"disable\":false,\"value\":[540,1080]},{\"index\":2,\"disable\":false,\"value\":[540,1080]},{\"index\":3,\"disable\":false,\"value\":[540,1080]},{\"index\":4,\"disable\":false,\"value\":[540,1080]},{\"index\":5,\"disable\":false,\"value\":[540,1080]},{\"index\":6,\"disable\":true,\"value\":[540,1080]}]")),
                'deleted_at' => NULL,
                'created_at' =>'2019-10-10 07:23:01',
                'updated_at' => '2019-10-10 07:23:01'
            ]);

            $this->info('branches added done');

            // create fees
            DB::statement("INSERT INTO km8_fees (id, organization_id, branch_id , fee_name, fee_type, frequency, net_amount, gross_amount, session_start, session_end, vendor_name, adjust, visibility, status, deleted_at, created_at, updated_at) VALUES
                        (1, 1, 1, 'casual', '1', '0', 150.25, 150.25, '480', '1080', '1', '0', '0', '0', NULL, '2020-02-07 08:01:44', '2020-02-07 08:01:44'),
                        (2, 1, 1, 'feeAA', '0', '0', 20, 20, '840', '1080', '1', '0', '0', '0', NULL, '2020-02-07 08:02:24', '2020-02-07 08:02:24'),
                        (3, 1, 1, 'fee hour', '0', '1', 35.5, 35.5, NULL, NULL, '1', '0', '0', '0', NULL, '2020-02-07 08:03:07', '2020-02-07 08:03:07'),
                        (4, 1, 1, 'fee', '0', '1', 25, 25, NULL, NULL, '1', '0', '0', '0', NULL, '2020-02-07 08:05:10', '2020-02-07 08:05:10'),
                        (5, 1, 1, 'casual hour', '1', '1', 150, 150, NULL, NULL, '1', '0', '0', '0', NULL, '2020-02-07 08:06:46', '2020-02-07 08:06:46'),
                        (6, 1, 1, 'ccs fee', '0', '1', 25.27, 25.27, NULL, NULL, '0', '0', '0', '0', NULL, '2020-02-07 09:07:15', '2020-02-07 09:07:15'),
                        (8, 1, 1, 'morning', '0', '0', 33, 33, '360', '720', '1', '0', '0', '0', NULL, '2020-02-07 09:43:14', '2020-02-07 09:43:14'),
                        (7, 1, 1, 'afternoon', '0', '0', 58, 58, '960', '1110', '1', '0', '0', '0', NULL, '2020-02-07 09:42:25', '2020-02-07 09:42:25'),
                        (9, 1, 1, 'full day', '0', '0', 120, 120, '480', '1080', '1', '0', '0', '0', NULL, '2020-02-07 09:45:07', '2020-02-07 09:45:07')");

            $this->info('fees added to ccmstest branch done');

            DB::table('km8_ccs')->insert([
                'organization_id' => $orgId,
                'activation_code' => '12345',
                'device_name' => 'test device',
                'PRODA_org_id' => 'Kinderm8',
                'person_id' => '12345',
                'key_status' => 'Active',
                'device_status' => 'Active',
                'key_expire' => '2020-08-27 10:11:33',
                'device_expire' => '2020-08-27 10:11:33',
                'status' => '0',
                'deleted_at' => NULL,
                'created_at' => '2018-08-27 10:11:33',
                'updated_at' => '2018-08-27 10:11:33',
            ]);

            $this->info('ccs data added done');

            $invoices = [
                [
                    'organization_id' => $orgId,
                    'start_date' => '2019-07-01',
                    'end_date' => '2019-07-31',
                    'number' => 'INV-0001',
                    'sequence_number' => 0001,
                    'due_date' => '2019-08-15',
                    'status' => 'paid',
                    'subtotal' => 250.00,
                    'generated_method' => 'auto',
                    'created_at' => '2018-08-27 10:11:33',
                    'updated_at' => '2018-08-27 10:11:33',
                ],
                [
                    'organization_id' => $orgId,
                    'start_date' => '2019-08-01',
                    'end_date' => '2019-08-31',
                    'number' => 'INV-0002',
                    'sequence_number' => 0002,
                    'due_date' => '2019-09-15',
                    'status' => 'failed',
                    'subtotal' => 250.00,
                    'generated_method' => 'auto',
                    'created_at' => '2018-08-27 10:11:33',
                    'updated_at' => '2018-08-27 10:11:33',
                ],
                [
                    'organization_id' => $orgId,
                    'start_date' => '2019-09-01',
                    'end_date' => '2019-09-30',
                    'number' => 'INV-0003',
                    'sequence_number' => 0003,
                    'due_date' => '2019-09-15',
                    'status' => 'pending',
                    'subtotal' => 250.00,
                    'generated_method' => 'auto',
                    'created_at' => '2018-08-27 10:11:33',
                    'updated_at' => '2018-08-27 10:11:33',
                ]
            ];

            $org_sub = OrganizationSubscription::with('addon')->where('organization_id', $orgId)->get();

            foreach ($invoices as $invoice) {

                $invoiceId = DB::table('km8_invoices')->insertGetId($invoice);

                foreach ($org_sub as $sub) {

                    DB::table('km8_invoice_items')->insert([
                        'invoice_id' => $invoiceId,
                        'subscription_id' => $sub->id,
                        'name' => $sub->addon->title,
                        'description' => $sub->addon->description,
                        'price' => $sub->price,
                        'quantity' => $sub->unit_type === Addon::FIXED_UNIT_TYPE ? 1 : 15,
                        'unit' => $sub->unit_type,
                        'status' => '0',
                        'created_at' => '2018-08-27 10:11:33',
                        'updated_at' => '2018-08-27 10:11:33',
                    ]);
                }
            }

            $this->info('invoice added done');

            $adjustment_items = ['Admin Fee', 'Excursion', 'Breakfast Fee', 'Adhoc Billing'];

            foreach ($adjustment_items as $item) {

                DB::table('km8_adjustment_items')->insert([
                    'organization_id' => $orgId,
                    'branch_id' => 1,
                    'name' => $item,
                    'description' => $item,
                    'created_at' => '2018-08-27 10:11:33',
                    'updated_at' => '2018-08-27 10:11:33',
                ]);

            }

            $this->info('adjustment items added done'); */

            DB::commit();

            $this->info('done');
        } catch (\Exception $e) {
            $this->error($e->getMessage());

            try {
                DB::rollBack();
            } catch (\Exception $err) {
                $this->error($err->getMessage());
            }
        }
    }
}
