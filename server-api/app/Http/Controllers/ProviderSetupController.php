<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\ProviderSetupResource;
use Kinderm8\Http\Resources\ProviderSetupResourceCollection;
use Kinderm8\Http\Resources\ServiceSetupResource;
use RequestHelper;
use LocalizationHelper;
use Kinderm8\ProviderSetup;
use Kinderm8\Enums\AWSConfigType;
use DB;
use ErrorHandler;
use Helpers;
use Carbon\Carbon;
use Log;
use Aws\Sns\SnsClient;
use Kinderm8\ServiceSetup;
use Kinderm8\Services\AWS\SNSContract;
use Exception;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;

class ProviderSetupcontroller extends Controller
{

    private $snsService;
    private $ccsSetupRepo;
    private $providerRepo;

    public function __construct(SNSContract $snsService, ICCSSetupRepository $ccsSetupRepo, IProviderRepository $providerRepo)
    {
        $this->snsService = $snsService;
        $this->ccsSetupRepo = $ccsSetupRepo;
        $this->providerRepo = $providerRepo;
    }

    public function create(Request $request)
    {

        DB::beginTransaction();

        try {

            $api_data = '';

            $newPro = new Provider();
            $newPro->id = $request->input('id');
            $newPro->providerID = $request->input('providerID');
            $newPro->buisness_name = $request->input('buisness_name');
            $newPro->legal_name = $request->input('legal_name');
            // $newPro->name_type = $request->input('nametype');
            $newPro->entity_type = $request->input('entitytype');
            $newPro->ABN = $request->input('ABN');
            $newPro->ACECQARegistrationCode = $request->input('ACECQARegistrationCode');
            $newPro->date_of_event = $request->input('dateofevent');
            // $newPro->mobile = $request->input('mobile');
            // $newPro->email = $request->input('email');
            $newPro->address_type = $request->input('addresstype');
            $newPro->streetLine1 = $request->input('streetLine1');
            $newPro->streetLine2 = $request->input('streetLine2');
            $newPro->suburb = $request->input('suburb');
            $newPro->state = $request->input('state');
            $newPro->postcode = $request->input('postcode');
            $newPro->date = $request->input('date');
            $newPro->BSB = $request->input('BSB');
            $newPro->accountNumber = $request->input('accountNumber');
            $newPro->accountName = $request->input('accountName');
            $newPro->mobile = $request->input('mobile');
            $newPro->phone = $request->input('phone');
            $newPro->email = $request->input('email');
            $newPro->date = $request->input('date');
            $newPro->service_id = $request->input('serviceid');
            $newPro->service_name = $request->input('servicename');
            $newPro->ccs_approval_status = $request->input('ccsapprovalstatus');


            $result = $newPro->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_201
            );
        } catch (\Exception $e) {
            ErrorHandler::log($e);
            DB::rollBack();
            return $e->getMessage();
            // return response()->json(
            //     RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            // ), RequestType::CODE_500);
        }
    }

    public function listProviders(Request $request)
    {

        try {

            $providers = ProviderSetup::with(['services', 'ccsSetup'])->where('organization_id', auth()->user()->organization_id)->get();


            // return response()->json(
            //     RequestHelper::sendResponse(
            //         RequestType::CODE_200,
            //         LocalizationHelper::getTranslatedText('response.success_create'),
            //         ["providers" => $providers]
            //     ), RequestType::CODE_200);

            // Log::info($providers);

            return (new ProviderSetupResourceCollection($providers, ['withServices' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        } catch (\Exception $e) {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function getProviders(Request $request)
    {

        try {

            $data = $this->providerRepo->get([], [], $request, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ProviderSetupResourceCollection($data, [])
                ),
                RequestType::CODE_200
            );


        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );

        }

    }

    public function getProvider(Request $request)
    {

        try {

            $id = Helpers::decodeHashedID($request->input('index'));
            $provider = ProviderSetup::with(['services', 'ccsSetup'])->find($id);

            if (is_null($provider))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            if($provider->is_synced !== '0') {

                $client = new \GuzzleHttp\Client();

                // $url = config('aws.end_points.account_management.get_provider');
                $url = Helpers::getConfig('account_management.get_provider', AWSConfigType::API_GATEWAY);
                $api_key = config('aws.gateway_api_key');

                $ccsOrg = $this->ccsSetupRepo->findByProvider($id, []);

                $res = $client->request('GET', $url, [
                    'headers' => [
                        'x-api-key' => $api_key,
                        'ccsproviderid' => $provider->provider_id,
                        'authpersonid' => $ccsOrg->person_id,
                        'ccssetupid' => $ccsOrg->id
                    ]
                ]);

                $body = $res->getBody()->getContents();

                $resp_data = json_decode($body, true);
                
                if (array_key_exists('results', $resp_data) && count($resp_data['results']) > 0) {
                    $providerFromApi = $resp_data['results'][0];
                } else {
                    $providerFromApi = [];
                }

                if($provider->is_synced !== '1') {
                    $error = json_decode($provider->syncerror,true);
                }
                else{
                    $error = '';
                }

                return (new ProviderSetupResource($provider))
                ->additional([
                    'ApiData' => $providerFromApi,
                    'syncerror' => $error
                    ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);
            }
            // elseif($provider->is_synced == '2' || $provider->is_synced == '3') {
            //     Log::info(json_decode($provider->syncerror,true));

            //     return (new ProviderSetupResource($provider))
            //     ->additional([
            //         'syncerror' => json_decode($provider->syncerror,true)
            //         'ApiData' => $providerFromApi
            //         ])
            //     ->response()
            //     ->setStatusCode(RequestType::CODE_200);
            // }

            else{

            return (new ProviderSetupResource($provider))
            ->additional([
                'ApiData' => '',
                'syncerror' => ''
                ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
            }

        } catch (\Exception $e) {

            ErrorHandler::log($e);
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function editAddress(Request $request)
    {

        DB::beginTransaction();

        try {

            $type = $request->input("type");
            $streetline1 = $request->input('streetLine1');
            $streetline2 = $request->input('streetLine2');
            $suburb = $request->input("suburb");
            $state = $request->input("state");
            $postalcode = $request->input("postcode");
            // $index = $request->input('index');
            $hash_id = $request->input('providerid');
            $sDate = $request->input('sdate') ? $request->input('sdate') : '' ;

            $provider = ProviderSetup::find(Helpers::decodeHashedID($hash_id));

            $address_arr = json_decode($provider->address, true);

            $search_type = $type === 'Physical' ? 'ZPHYSICAL' : 'ZPOSTAL';

            $index = array_search($search_type, array_column($address_arr, 'type'));
            // Log::info($index);

            if (isset($address_arr[$index])) {

                $updated_addr = [
                    'type' => $search_type,
                    'streetLine1' => empty($streetline1) ? '' : $streetline1,
                    'streetLine2' => empty($streetline2) ? '' : $streetline2,
                    'suburb' => empty($suburb) ? '' : $suburb,
                    'postcode' => empty($postalcode) ? '' : $postalcode,
                    'state' => empty($state) ? '' : $state,
                    'startDate' => $sDate,
                    'endDate' => ""
                ];

                $address_arr[$index] = $updated_addr;

                // Log::info($address_arr);

                $provider->is_synced = 0;
                $provider->address = json_encode($address_arr);

                $provider->save();

                $ccsOrg = $this->ccsSetupRepo->findByProvider($provider->id, []);

                // $this->sendProviderAddressChangedSNS($provider);

                // $sns = new SnsClient([
                //     'region' => config('aws.region'),
                //     'version' => "2010-03-31",
                //     'credentials' => new Credentials(
                //         config('aws.access_key'),
                //         config('aws.secret_key')
                //     )
                // ]);

                // $message = json_encode([
                //     "organization" => $provider->organization_id,
                //     "subjectid" => $provider->id,
                //     "authpersonid" => $ccsOrg->person_id,
                //     "action" => "Provider address updated"
                // ]);

                // $result = $sns->publish([
                //     'Message' => $message,
                //     'TopicArn' => config('aws.sns.account_management.provider_address_update'),
                //     'Subject' => 'Provider Adress Change (SNS)'
                // ]);
                // Log::info($result);

                $this->snsService->publishEvent(
                    Helpers::getConfig('account_management.provider_address_update', AWSConfigType::SNS),
                    [
                    "organization" => $provider->organization_id,
                    "subjectid" => $provider->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "Provider address updated"
                    ],
                    'Provider Adress Change (SNS)'
                );
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            DB::rollBack();
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

            /**
     * send enrolment submit SNS
     */
    public function sendProviderAddressChangedSNS($provider)
    {
        try
        {
            // send sns message
           $sns = new SnsClient([
                'region' => config('aws.region'),
                'version' => "2010-03-31"
            ]);

            $ccsOrg = $this->ccsSetupRepo->findByProvider($provider->id, []);

            $message = json_encode([
                "organization" => $provider->organization_id,
                "subjectid" => $provider->id,
                "authpersonid" =>$ccsOrg->person_id,
                "action" => "Provider address updated"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' =>config('aws.sns.account_management.provider_address_update'),
                'Subject' => 'Provider Adress Change (SNS)'
            ]);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }


    public function editFinancial(Request $request)
    {

        DB::beginTransaction();
        try {


            $date = $request->input("date");
            $BSB = $request->input("BSB");
            $accountNumber = $request->input("accountNumber");
            $accountName = $request->input("accountName");
            $index = $request->input('index');
            $hash_id = $request->input('providerid');


            $provider = ProviderSetup::find(Helpers::decodeHashedID($hash_id));

            $financial_arr = json_decode($provider->financial, true);

            // Log::info('here1');

            if (isset($financial_arr[$index])) {

                $financial_arr[$index] = [
                    'date' => $date,
                    'BSB' => empty($BSB) ? '' : $BSB,
                    'accountNumber' => empty($accountNumber) ? '' : $accountNumber,
                    'accountName' => empty($accountName) ? '' : $accountName,

                ];

                $provider->financial = json_encode($financial_arr);

                $provider->save();
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'Successfull'
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }
    public function editContact(Request $request)
    {

        DB::beginTransaction();
        try {


            $date = $request->input("date");
            $email = $request->input("email");
            $phone = $request->input("phone");
            $mobile = $request->input("mobile");
            $index = $request->input('index');
            $hash_id = $request->input('providerid');


            $provider = ProviderSetup::find(Helpers::decodeHashedID($hash_id));

            $Contact_arr = json_decode($provider->Contact, true);





            if (isset($Contact_arr[$index])) {

                $Contact_arr[$index] = [
                    'date' => empty($date) ? '' : $date,
                    'email' => empty($email) ? '' : $email,
                    'phone' => empty($phone) ? '' : $phone,
                    'mobile' => empty($mobile) ? '' : $mobile,

                ];

                $provider->Contact = json_encode($Contact_arr);

                $provider->save();
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'Successfull'
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function addProvider(Request $request)
    {

        DB::beginTransaction();

        try {

            $provider_id = $request->input('providerid');
            $ccs_setup_id = Helpers::decodeHashedID($request->input('ccs_setup_id'));

            $ccs_setup = $this->ccsSetupRepo->findById($ccs_setup_id, []);

            // 190009003H
            if(ProviderSetup::where('provider_id','=',$provider_id)->get()->count() > 1){
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, 'Provider Exists'
                ), RequestType::CODE_404);
            }

            $client = new \GuzzleHttp\Client();
            $url = Helpers::getConfig('account_management.add_provider', AWSConfigType::API_GATEWAY);
            $api_key = config('aws.gateway_api_key');

            $res = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => $api_key,
                    'ccsproviderid' => $provider_id,
                    'authpersonid' => $ccs_setup->person_id,
                    'ccssetupid' => $ccs_setup_id
                ]
            ]);

            $body = $res->getBody()->getContents();

            $resp_data = json_decode($body, true);

            if(count($resp_data['results']) > 0) {

                $business_name = null;
                $legal_name = null;

                if ($resp_data['results'][0]['ProviderName']) {

                    $names_arr = $resp_data['results'][0]['ProviderName']['results'];

                    $bus_index = array_search('BUS', array_column($names_arr, 'type'));
                    $leg_index = array_search('LGL', array_column($names_arr, 'type'));

                    if ($bus_index !== false) {
                        $business_name = $names_arr[$bus_index]['name']; 
                    }

                    if ($leg_index !== false) {
                        $legal_name = $names_arr[$leg_index]['name'];
                    }

                }

                $provider = new ProviderSetup();

                $provider->name_type = '';
                $provider->mobile = '';
                $provider->email = '';
                $provider->ccs_setup_id = $ccs_setup_id;
                $provider->organization_id = auth()->user()->organization_id;
                $provider->buisness_name = $business_name;
                $provider->date_of_event = $resp_data['results'][0]['ProviderName']['results'][0]['dateOfEvent'];
                $provider->provider_id = $resp_data['results'][0]['providerID'];
                $provider->registration_code = $resp_data['results'][0]['ACECQARegistrationCode'];
                $provider->ABN = $resp_data['results'][0]['providerABN'];
                $provider->entity_type = $resp_data['results'][0]['providerEntityType'];
                $provider->legal_name = $legal_name;
                $provider->address = json_encode($resp_data['results'][0]['Address']['results']);
                $provider->financial = json_encode($resp_data['results'][0]['Financial']['results']);
                $provider->contact = json_encode($resp_data['results'][0]['Contact']['results']);
                $provider->is_synced = '1'; // default 1

                $provider->save();

                if ($resp_data['results'][0]['Service']['results'] && count($resp_data['results'][0]['Service']['results']) > 0) {

                    $service_array = $resp_data['results'][0]['Service']['results'];

                    foreach ($service_array as $service_obj) {

                        $service_client = new \GuzzleHttp\Client();

                        $service_url = Helpers::getConfig('account_management.add_provider_service', AWSConfigType::API_GATEWAY);

                        $service_response = $service_client->request('GET', $service_url, [
                            'headers' => [
                                'x-api-key' => $api_key,
                                'ccsserviceid ' => $service_obj['serviceID'],
                                'authpersonid' => $ccs_setup->person_id,
                                'ccssetupid' => $ccs_setup_id
                            ]
                        ]);

                        $service_body = $service_response->getBody()->getContents();

                        $service_data = json_decode($service_body, true);

                        $service = new ServiceSetup();
                        $service->provider_id = $provider->id;
                        $service->organization_id = auth()->user()->organization_id;
                        $service->service_id = $service_data['results'][0]['serviceID'];
                        $service->service_type = $service_data['results'][0]['serviceType'];
                        $service->no_of_weeks = $service_data['results'][0]['numberOfWeeksPerYear'];

                        $service->service_name = $service_data['results'][0]['ServiceName']['results'][0]['name'];
                        $service->start_date = '2019-10-20'; //$service_data['results'][0]['startDate'];
                        $service->end_date = '2019-12-20'; //$service_data['results'][0]['endDate'];
                        $service->ACECQARegistrationCode = $service_data['results'][0]['ACECQARegistrationCode'];
                        $service->address = $service_data['results'][0]['Address']['results'];//json_encode();
                        $service->financial = json_encode($service_data['results'][0]['Financial']['results']);
                        $service->contact = json_encode($service_data['results'][0]['Contact']['results']);
                        $service->is_synced = '1'; // default 1

                        $service->save();
                    }
                }

                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_create')
                    ),
                    RequestType::CODE_200
                );
            }
            else{
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

        } catch (\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


    public function editBusinessName(Request $request)
    {

        DB::beginTransaction();
        try {


            $hash_id = $request->input('id');
            $provider = ProviderSetup::find(Helpers::decodeHashedID($hash_id));

            if (is_null($provider))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            $bName = $request->input("bName");
            $lName = $request->input('lName');
            $resp_data = $request->input('apiData');
            $sDate = $request->input('sdate') ? $request->input('sdate') : '';

            // Log::info($bName);
            // Log::info($resp_data);
            // Log::info($provider);

            $provider->legal_name = $lName;
            $provider->buisness_name = $bName;
            $provider->date_of_event = $sDate;
            // $provider->date_of_event = $resp_data['ProviderName']['results'][0]['dateOfEvent'];
            // $provider->provider_id = $resp_data['providerID'];
            // $provider->registration_code = $resp_data['ACECQARegistrationCode'];
            // $provider->ABN = $resp_data['providerABN'];
            // $provider->entity_type = $resp_data['providerEntityType'];
            // $provider->legal_name = $resp_data['ProviderName']['results'][0]['name'];
            // $provider->address = json_encode($resp_data['Address']['results']);
            // $provider->financial = json_encode($resp_data['Financial']['results']);
            // $provider->contact = json_encode($resp_data['Contact']['results']);
            $provider->is_synced = 0;

            $provider->save();

            $ccsOrg = $this->ccsSetupRepo->findByProvider($provider->id, []);

            // $sns = new SnsClient([
            //     'region' => config('aws.region'),
            //     'version' => "2010-03-31"
            // ]);

            // $message = json_encode([
            //     "organization" => $provider->organization_id,
            //     "subjectid" => $provider->id,
            //     "authpersonid" =>$ccsOrg->person_id,
            //     "action" => "Provider Name updated"
            // ]);

            // $result = $sns->publish([
            //     'Message' => $message,
            //     'TopicArn' => config('aws.sns.account_management.provider_name_update'),
            //     'Subject' => 'Provider Name Change (SNS)'
            // ]);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.provider_name_update', AWSConfigType::SNS),
                [
                    "organization" => $provider->organization_id,
                    "subjectid" => $provider->id,
                    "authpersonid" =>$ccsOrg->person_id,
                    "action" => "Provider Name updated"
                ],
                'Provider Name updated'
            );


            // $provider = ProviderSetup::find(Helpers::decodeHashedID($hash_id));

            // $Contact_arr = json_decode($provider->Contact, true);





            // if (isset($Contact_arr[$index])) {

            //     $Contact_arr[$index] = [
            //         'date' => empty($date) ? '' : $date,
            //         'email' => empty($email) ? '' : $email,
            //         'phone' => empty($phone) ? '' : $phone,
            //         'mobile' => empty($mobile) ? '' : $mobile,

            //     ];

            //     $provider->Contact = json_encode($Contact_arr);

            //     $provider->save();
            // }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'Successfull'
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


    public function getProviderAPI($providerId)
    {

        DB::beginTransaction();
        try {


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'Successfull'
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


}
