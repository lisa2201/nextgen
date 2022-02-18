<?php

namespace Kinderm8\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Kinderm8\Branch;
use Kinderm8\EducatorRatio;
use Kinderm8\Enums\RequestType;
use Illuminate\Support\Facades\Crypt;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\EducatorRatioResourceCollection;
use Kinderm8\Repositories\EducatorRatio\IEducatorRatioRepository;
use RequestHelper;
use LocalizationHelper;
use Kinderm8\ServiceSetup;
use DB;
use ErrorHandler;
use Helpers;
use Log;
use Aws\Sns\SnsClient;
use Carbon\Carbon;
use Kinderm8\Http\Resources\ServiceSetupResource;
use Kinderm8\Http\Resources\ServiceSetupResourceCollection;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;

class ServiceSetupcontroller extends Controller
{

    private $snsService;
    private $educatorRatioRepo;
    private $serviceRepo;
    private $providerRepo;
    private $ccsSetupRepo;

    public function __construct(SNSContract $snsService, IEducatorRatioRepository $educatorRatioRepo, IServiceRepository $serviceRepo, IProviderRepository $providerRepo, ICCSSetupRepository $ccsSetupRepo)
    {
        $this->snsService = $snsService;
        $this->educatorRatioRepo = $educatorRatioRepo;
        $this->serviceRepo = $serviceRepo;
        $this->providerRepo = $providerRepo;
        $this->ccsSetupRepo = $ccsSetupRepo;
    }

    public function create(Request $request)
    {

        DB::beginTransaction();

        try {

            $newPro = new ServiceSetup();
            $newPro->id = $request->input('id');
            $newPro->service_id = $request->input('serviceid');
            $newPro->service_name = $request->input('servicename');
            $newPro->service_type = $request->input('servicetype');
            $newPro->start_date = $request->input('startdate');
            $newPro->end_date = $request->input('enddate');
            $newPro->ccs_approval_status = $request->input('ccsapprovalstatus');
            $newPro->ACECQA_registration_code = $request->input('ACECQARegistrationCode');
            $newPro->ACECQAExemptionReason = $request->input('ACECQAExemptionReason');
            $newPro->no_of_weeks = $request->input('noofweeks');
            $newPro->mobile = $request->input('mobile');
            $newPro->email = $request->input('email');
            $newPro->address_type = $request->input('addresstype');
            $newPro->address_line = $request->input('addressline');
            $newPro->suburb = $request->input('suburb');
            $newPro->state = $request->input('state');
            $newPro->postal_code = $request->input('postalcode');
            $newPro->BSB = $request->input('BSB');
            $newPro->accountNumber = $request->input('accountNumber');
            $newPro->accountName = $request->input('accountName');
            $newPro->mobile = $request->input('mobile');
            $newPro->phone = $request->input('phone');
            $newPro->email = $request->input('email');
            $newPro->date = $request->input('date');


            $result = $newPro->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {
            DB::rollBack();
            return $e->getMessage();
            // return response()->json(
            //     RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            // ), RequestType::CODE_500);
        }
    }

    public function listServices(Request $request)
    {

        $services = [];

        try
        {

            if (auth()->user()->hasOwnerAccess())
            {
                if(auth()->user()->organization_id != null)
                {
                    $services = ServiceSetup::with(['provider.ccsSetup'])->where('organization_id', auth()->user()->organization_id)->get();
                }
            }
            else
            {
                if(auth()->user()->branch->service_id != null) {
                    // $services = ServiceSetup::find(auth()->user()->branch->service_id)->get();
                    $services = ServiceSetup::with(['provider.ccsSetup'])->where('organization_id', auth()->user()->organization_id)
                        ->where('service_id', auth()->user()->branch->providerService->service_id)
                        ->get();

                }
            }

            return (new ServiceSetupResourceCollection($services))
            ->response()
            ->setStatusCode(RequestType::CODE_200);


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
    public function getService(Request $request)
    {

        try
        {

            $id = Helpers::decodeHashedID($request->input('index'));

            $service = ServiceSetup::with('provider.ccsSetup')->find($id);

            $ccsSetup = $this->ccsSetupRepo->findByService($service->id, []);

            $client = new \GuzzleHttp\Client();

            $url = Helpers::getConfig('account_management.get_service', AWSConfigType::API_GATEWAY);
            $api_key = config('aws.gateway_api_key');

            $res = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => $api_key,
                    'ccsserviceid' => $service->service_id,
                    'authpersonid' => $ccsSetup->person_id,
                    'ccssetupid' => $ccsSetup->id
                ]
            ]);

            $body = $res->getBody()->getContents();

            $resp_data = json_decode($body, true);

            if (array_key_exists('results', $resp_data) && count($resp_data['results']) > 0) {
                $serviceFromApi = $resp_data['results'][0];
            } else {
                $serviceFromApi = [];
            }

            return (new ServiceSetupResource($service))
            ->additional([
                'apiData' => $serviceFromApi,
                ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);


        } catch (\Exception $e)
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


    public function editAddress(Request $request)
    {

        DB::beginTransaction();

        try {

            $type = $request->input("type");
            $streetLine1 = $request->input('streetLine1');
            $streetLine2 = $request->input('streetLine2');
            $suburb = $request->input("suburb");
            $state = $request->input("state");
            $postalcode = $request->input("postcode");
            // $index = $request->input('index');
            $hash_id = $request->input('serviceid');
            $sDate = $request->input('sdate');

            $service = ServiceSetup::find(Helpers::decodeHashedID($hash_id));


            $address_arr = $service->address;

            $search_type = $type === 'Physical' ? 'ZPHYSICAL' : 'ZPOSTAL';

            $index = array_search($search_type, array_column($address_arr, 'type'));
            // Log::info($index);


            if (isset($address_arr[$index])) {

                $updated_addr = [
                    'type' => $search_type,
                    'streetline1' => empty($streetLine1) ? '' : $streetLine1,
                    'streetline2' => empty($streetLine2) ? '' : $streetLine2,
                    'suburb' => empty($suburb) ? '' : $suburb,
                    'postcode' => empty($postalcode) ? '' : $postalcode,
                    'state' => empty($state) ? '' : $state,
                    'startDate' => $sDate,
                    'endDate' => ""
                ];

                // Log::info($updated_addr);
                $address_arr[$index] = $updated_addr;

                // $address_arr[$index] = [
                //     'type' => empty($type) ? '' : $type,
                //     'streetLine1' => empty($streetLine1) ? '' : $streetLine1,
                //     'streetLine2' => empty($streetLine2) ? '' : $streetLine2,
                //     'suburb' => empty($suburb) ? '' : $suburb,
                //     'postcode' => empty($postalcode) ? '' : $postalcode,
                //     'state' => empty($state) ? '' : $state,
                //     'startDate' => $sDate,
                //     'endDate' => ""

                // ];


                $service->address = $address_arr;
                $service->is_synced = '0';
                $service->save();

                $ccsOrg = $this->ccsSetupRepo->findByService($service->id, []);

                // $sns = new SnsClient([
                //     'region' => config('aws.region'),
                //     'version' => "2010-03-31"
                // ]);

                // $message = json_encode([
                //     "organization" => $service->organization_id,
                //     "subjectid" => $service->id,
                //     "authpersonid" =>$ccsOrg->person_id,
                //     "action" => "Provider address updated"
                // ]);

                // $result = $sns->publish([
                //     'Message' => $message,
                //     'TopicArn'  =>config('aws.sns.account_management.service_address_update'),
                //     'Subject' => 'Provider address updated'
                // ]);

                $this->snsService->publishEvent(
                    Helpers::getConfig('account_management.service_address_update', AWSConfigType::SNS),
                    [
                        "organization" => $service->organization_id,
                    "subjectid" => $service->id,
                    "authpersonid" =>$ccsOrg->person_id,
                    "action" => "Service address updated"
                    ],
                    'Service Adress Change (SNS)'
                );

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

            Log::error($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function editName(Request $request)
    {

        DB::beginTransaction();

        try {


            $name = $request->input('name');
            $apiData = $request->input('apiData');
            $hash_id = $request->input('id');
            $sDate = $request->input('sdate');


            $service = ServiceSetup::find(Helpers::decodeHashedID($hash_id));

            $service->service_name = $request->input('name')?$request->input('name') : '';
            $service->is_synced = '0';
            $service->start_date = $sDate;
            $service->save();

            $ccsOrg = $this->ccsSetupRepo->findByService($service->id, []);

            // $sns = new SnsClient([
            //     'region' => config('aws.region'),
            //     'version' => "2010-03-31"
            // ]);

            // $message = json_encode([
            //     "organization" => $service->organization_id,
            //     "subjectid" => $service->id,
            //     "authpersonid" =>$ccsOrg->person_id,
            //     "action" => "Service Name update"
            // ]);

            // $result = $sns->publish([
            //     'Message' => $message,
            //     'TopicArn' => config('aws.sns.account_management.service_update'),
            //     'Subject' => 'service name update'
            // ]);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.service_update', AWSConfigType::SNS),
                [
                    "organization" => $service->organization_id,
                    "subjectid" => $service->id,
                    "authpersonid" =>$ccsOrg->person_id,
                    "action" => "Service Name update"
                ],
                'service name update'
            );


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

            Log::error($e);

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


            $BSB= $request->input("BSB");
            $accountNumber = $request->input("accountNumber");
            $accountName = $request->input("accountName");
            $date = $request->input('date');
            $index = $request->input('index');
            $hash_id = $request->input('serviceid');


            $service = ServiceSetup::find(Helpers::decodeHashedID($hash_id));

            $financial_arr = json_decode($service->financial, true);

            // Log::info('here');
            if (isset($financial_arr[$index])) {

                $financial_arr[$index] = [
                    'date' => $date,
                    'BSB' => empty($BSB) ? '' : $BSB,
                    'accountNumber' => empty($accountNumber) ? '' : $accountNumber,
                    'accountName' => empty($accountName) ? '' : $accountName,
                ];

                $service->financial = json_encode($financial_arr);

                $service->save();
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

            Log::error($e);

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


            $date= $request->input("date");
            $email = $request->input("email");
            $phone = $request->input("phone");
            $mobile = $request->input("mobile");
            $index = $request->input('index');
            $hash_id = $request->input('serviceid');


            $service = ServiceSetup::find(Helpers::decodeHashedID($hash_id));

            $Contact_arr = json_decode($service->Contact, true);





            if (isset($Contact_arr[$index])) {

                $Contact_arr[$index] = [
                    'date' => empty($date) ? '' : $date,
                    'email' => empty($email) ? '' : $email,
                    'phone' => empty($phone) ? '' : $phone,
                    'mobile' => empty($mobile) ? '' : $mobile,

                ];

                $service->Contact = json_encode($Contact_arr);

                $service->save();
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

            Log::error($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function getAccsPercentage(Request $request)
    {

        try {

            $queryDate = $request['queryDate'];

            $service_setup_id = Helpers::decodeHashedID($request->input('serviceID'));

            Log::info($service_setup_id);

            $service = $this->serviceRepo->findById($service_setup_id, []);

            $ccsProvider = $this->providerRepo->findByService($service_setup_id, []);
            $providerID = $ccsProvider->provider_id;

            $ccsOrg = $this->ccsSetupRepo->findByService($service_setup_id, []);
            $auth_person_id = $ccsOrg->person_id;

            $client = new \GuzzleHttp\Client();

            // $urlConfig = config('aws.end_points.account_management.get_accs_percentage');
            $url = Helpers::getConfig('account_management.get_accs_percentage', AWSConfigType::API_GATEWAY);
            $url = $url.$providerID.'&$ccsserviceid='.$service->service_id.'&$ccsquerydate='.$queryDate;

            $res = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                    'authpersonid' => $auth_person_id,
                ]
            ]);

            $body = $res->getBody()->getContents();
            $resp_data = json_decode($body, true);
            // log::info($resp_data);

            // $resp_data = array(
            //     'body-json' =>
            //     array(
            //         'ACCSPercentage' =>
            //         array(
            //             '__metadata' =>
            //             array(
            //                 'type' => 'ACCS.ACCSPercentage',
            //             ),
            //             'providerID' => '190009003H',
            //             'serviceID' => '190012455K',
            //             'queryDate' => '2020-01-01',
            //             'ACCSPercentageCap' => '50.00',
            //             'numberOfChildAtRisk' => '000',
            //             'percentageOfChildAtRisk' => '0.00',
            //             'certificateOrApplicationToBeSubmitted' => 'CERT',
            //         ),
            //     ),
            // );

            $data = $resp_data == 'Fail' ? null : $resp_data;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'Successfull',
                    $data
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {

            Log::error($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


    public function pingCCMS(Request $request){
        //return $request;
        //get api data for certificates which are not in db.
        $auth_person_id = '0110460024';
        $client = new \GuzzleHttp\Client();
        /*$res = $client->request('GET', $url, [
            'headers' => [
                'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                'authpersonid' => $auth_person_id,
            ]
        ]);*/
        $service = ServiceSetup::where('service_id',$request->serviceID)->get()->first();
        // $service = ServiceSetup::find(2)->get()->first();
        $username = $password = null;
        if($service->credentials)
        {
            if(array_key_exists('username',$service->credentials))
            {
                $username = $service->credentials['username'];
            }
            if(array_key_exists('password',$service->credentials))
            {
                $password = Crypt::decryptString($service->credentials['password']);
            }


            if(!$username && !$password)
            {
                return ['ReturnMessage' => 'CCMS credentials not found. Please update the credentials.', 'ReturnError' => 'No Credentials Error' , 'ServiceID' => $request->serviceID, 'Service' => new ServiceSetupResource($service) ];
            }
        }
        else
        {
            return ['ReturnMessage' => 'CCMS credentials not found. Please update the credentials.', 'ReturnError' => 'No Credentials Error' , 'ServiceID' => $request->serviceID, 'Service' => new ServiceSetupResource($service) ];
        }
        // \Log::info("username ======>".$username);
        // \Log::info("password ======>".$password);

        // $url = Helpers::getConfig('account_management.ping_CCMS',AWSConfigType::API_GATEWAY);
        $url =  Helpers::getConfig('account_management.ping_ccms', AWSConfigType::API_GATEWAY);

        try {
            $response = $client->post($url, [
                'auth' => [
                    $username,
                    $password
                ],
                /*'json' => [
                    'PingRequest' => '1234',
                    'SourceSystemCode' => 'KINDv2.069hbk',
                    'ApprovalId' => $request->serviceID
                ]*/
            ]);
            Log::info('Success');
        }
        catch (\Exception $e){
            Log::error($e);
            Log::info('Error');
        // $errorResponse = $e->getResponse()->getBody()->getContents();
            if($e->getResponse())
            {
                $errorResponse = (string) $e->getResponse()->getBody();
                if($errorResponse)
                {
                    $errorResponseJSON = json_decode($errorResponse, true);
                    if($errorResponseJSON['Category'] && $errorResponseJSON['FaultText'])
                        return ['ReturnMessage' => $errorResponseJSON['FaultText'], 'ReturnError' => 'API Error'];
                    if($errorResponseJSON['Category'])
                        return ['ReturnMessage' => $errorResponseJSON['Category'], 'ReturnError' => 'API Error'];
                }
            }
            /*if($errorResponse->Category)
                return ['ReturnMessage' => $errorResponse->FaultText, 'ReturnError' => 'API Error'];*/
            return ['ReturnMessage' => 'Error Connecting to API', 'ReturnError' => 'API Error'];
        }

        $body = $response->getBody()->getContents();
        Log::info($body);
        return $body;
    }


    public function updateCredentials(Request $request){
        $serviceID = $request->input('service');
        $username = $request->input('username');
        $password = $request->input('password');
        $password = Crypt::encryptString($password);
        $authpersonID = $request->input('authpersonid');
        $authpersonFirstName = $request->input('authpersonfname');
        $authpersonLastName = $request->input('authpersonlname');

        $service = ServiceSetup::where('service_id',$serviceID)->get()->first();
        $credentials = [
            'username' => $username,
            'password' => $password,
            'authpersonid' => $authpersonID,
            'authpersonfname' => $authpersonFirstName,
            'authpersonlname' => $authpersonLastName
        ];
        $service->credentials = $credentials;
        $service->save();


        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_submitted')
            ),
            RequestType::CODE_201
        );
    }

    public function getEducatorRatio(Request $request)
    {

        $data = $this->educatorRatioRepo->get([], $request);
        $states = EducatorRatio::select('state')->distinct()->get();
        $branch = auth()->user()->branch;

        return (new EducatorRatioResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
                'states' => $states,
                'branch' => $branch->center_settings
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function setState(Request $request)
    {
        $branchId = Helpers::decodeHashedID($request->input('branch_id'));
        $state = $request->input('state');

        $branch = Branch::find($branchId);
        $center_settings = $branch->center_settings;
        $center_settings['state'] = $state;

        $ratios = $request->input('ratio');
        if($state == 'WA')
        {
            $center_settings['kindergarten_attendance'] = $request->input('WAStateKindergatenInput');
        }
        if($state == 'TAS')
        {
            $center_settings['preschool_program'] = $request->input('TASStatePreschoolProgramInput');
        }
        /*$centerRatio = [];
        foreach($ratios as $ratio)
        {
            $pushRatio = [
                'age_group' => $ratio['age_group'],
                'ratio_display' => $ratio['ratio_display'],
                'ratio_decimal' => $ratio['ratio_decimal']
            ];
            array_push($centerRatio, $pushRatio);
        }*/
        $center_settings['center_ratio'] = $ratios;
        $branch->center_settings = $center_settings;
        $branch->save();
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_submitted')
            ),
            RequestType::CODE_201
        );
    }

    public function addService(Request $request)
    {

        $apiService = null;

        DB::beginTransaction();

        try {

            $provider = $this->providerRepo->findById(Helpers::decodeHashedID($request->input('provider_id')), ['ccsSetup']);

            \Log::info($provider->ccs_setup_id);

            $apiService = $this->serviceRepo->read($request, $provider->ccsSetup->person_id, $provider->ccs_setup_id);

            \Log::info($apiService);

            if($apiService === null) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $service = $this->serviceRepo->store($apiService, $provider->id);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
    }
}
