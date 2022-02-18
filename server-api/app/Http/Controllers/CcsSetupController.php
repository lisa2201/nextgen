<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use GuzzleHttp\Client;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Kinderm8\CCSEntitlement;
use Kinderm8\CcsSetup;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\CCSEntitlementResourceCollection;
use Kinderm8\Http\Resources\CcsResource;
use Kinderm8\Http\Resources\CcsResourceCollection;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;
use LocalizationHelper;
use Log;
use RequestHelper;

class CcsSetupController extends Controller
{
    private $ccsEntitlementRepo;
    private $ccsSetupRepo;
    private $providerRepo;

    public function __construct(ICCSEntitlementRepository $ccsEntitlementRepo, ICCSSetupRepository $ccsSetupRepo, IProviderRepository $providerRepo)
    {
        $this->ccsEntitlementRepo = $ccsEntitlementRepo;
        $this->ccsSetupRepo = $ccsSetupRepo;
        $this->providerRepo = $providerRepo;
    }

    public function store(request $request)
    {
        DB::beginTransaction();

        try
        {
            $client = new Client();
            $activation_code = $request->input('activation_code');
            $device_name = $request->input('device_name');
            $proda_org_id = $request->input('proda_org_id');
            $person_id = $request->input('person_id');

            $response1 = $client->request('POST', Helpers::getConfig('ccs_operation.store_ccs_setup', AWSConfigType::API_GATEWAY), [
                'headers' => [
                    'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                    'authpersonid' => $person_id,
                ],
                'json' => [
                    "activationcode" => $request->input('activation_code'),
                    "devicename" => $request->input('device_name'),
                    "orgid" => $request->input('proda_org_id'),
                ],
            ]);

            if ($response1->getStatusCode() == 200) {

                $body = json_decode($response1->getBody(), true);

                $new_ccs = new CcsSetup();
                $new_ccs->organization_id = auth()->user()->organization_id;
                $new_ccs->activation_code = $request->input('activation_code');
                $new_ccs->device_name = $body['deviceName'];
                $new_ccs->PRODA_org_id = $body['orgId'];
                $new_ccs->person_id = $request->input('person_id');
                $new_ccs->device_status = ($body['deviceStatus'] == "ACTIVE") ? '0' : '1';
                $new_ccs->key_status = ($body['keyStatus'] == "ACTIVE") ? '0' : '1';
                $new_ccs->key_expire = $body['keyExpiry'];
                $new_ccs->device_expire = $body['deviceExpiry'];
                $new_ccs->status = '0';
                $new_ccs->save();

                DB::commit();
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('ccs.success_activated'),
                        $new_ccs
                    ),
                    RequestType::CODE_201
                );
            } else {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        LocalizationHelper::getTranslatedText('system.internal_error')
                    ),
                    RequestType::CODE_500
                );
            }
        } catch (Exception $e) {
            DB::rollBack();
            return false;
        }
    }

    public function list(Request $request)
    {

        try {

            $data = $this->ccsSetupRepo->list($request);

            return (new CcsResourceCollection($data['items'], []))
                ->additional([
                    'totalRecords' => $data['totalRecords'],
                    'filtered' => $data['filtered']
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);


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

    public function get(Request $request)
    {

        try {

            $data = $this->ccsSetupRepo->get([], ['providers'], $request, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new CcsResourceCollection($data, [])
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

    public function edit(Request $request)
    {
        try {
            $id = Helpers::decodeHashedID($request->input('index'));

            $rowObj = CcsSetup::find($id);

            if (is_null($rowObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new CcsResource($rowObj)
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

    public function update(Request $request)
    {
        DB::beginTransaction();
        try {
            $client = new Client();
            $activation_code = $request->input('activation_code');
            $id = Helpers::decodeHashedID($request->input('id'));

            $new_ccs = CcsSetup::find($id);
            $datar = $new_ccs->device_name;

            if (!is_null($new_ccs)) {
                $response1 = $client->request('PUT', Helpers::getConfig('ccs_operation.store_ccs_setup', AWSConfigType::API_GATEWAY), [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => $new_ccs->person_id,
                    ],
                    'json' => [
                        "activationcode" => $activation_code,
                        "devicename" => $new_ccs->device_name,
                        "orgid" => $new_ccs->PRODA_org_id,
                    ],
                ]);

                if ($response1->getStatusCode() == 200) {
                    $body = json_decode($response1->getBody(), true);

                    $new_ccs->organization_id = auth()->user()->organization_id;
                    $new_ccs->activation_code = $activation_code;
                    $new_ccs->device_name = $body['deviceName'];
                    $new_ccs->PRODA_org_id = $body['orgId'];
                    $new_ccs->person_id = $new_ccs->person_id;
                    $new_ccs->device_status = ($body['deviceStatus'] == "ACTIVE") ? '0' : '1';
                    $new_ccs->key_status = ($body['keyStatus'] == "ACTIVE") ? '0' : '1';
                    $new_ccs->key_expire = $body['keyExpiry'];
                    $new_ccs->device_expire = $body['deviceExpiry'];
                    $new_ccs->status = '0';
                    $new_ccs->save();

                    DB::commit();
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_201,
                            LocalizationHelper::getTranslatedText('ccs.success_re_activated'),
                            $new_ccs
                        ),
                        RequestType::CODE_201
                    );
                } else {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_500,
                            LocalizationHelper::getTranslatedText('system.internal_error')
                        ),
                        RequestType::CODE_500
                    );
                }
            }
        } catch (Exception $e) {
            DB::rollBack();
            return false;
        }
    }

    // ccs message list

    public function getMessageList(Request $request)
    {

        try {

            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;;

            $url = Helpers::getConfig('ccs_operation.get_message_list', AWSConfigType::API_GATEWAY);

            if (auth()->user()->isBranchUser()) {

                $id = auth()->user()->branch->providerService->service_id;
                $auth_person_id = auth()->user()->ccs_id;

            } else {
                
                if ($filters && Helpers::IsNullOrEmpty($filters->provider_id)) {

                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'Please select provider'
                        ),
                        RequestType::CODE_400
                    );

                }
                
                $ccsProvider = $this->providerRepo->findById(Helpers::decodeHashedID($filters->provider_id), []);
                $ccsOrg = $this->ccsSetupRepo->findByProvider($ccsProvider->id, []);

                $id = $ccsProvider->provider_id;
                $auth_person_id = $ccsOrg->person_id;
                
            }

            //$date = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : Carbon::now()->toDateString();
            // \Log::info($request->input('filters'));
            $sDate = $filters->sDate ? $filters->sDate : null;
            $eDate = $filters->eDate ? $filters->eDate : null;
            if(array_key_exists('type', $filters))
                $type = $filters->type;
            if(array_key_exists ('source',$filters))
                $source = $filters->source;

            if (is_null($sDate) || is_null($id) || is_null($eDate)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            // Log::info($date);
            // Log::info($id);

            // $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/notifications?$ccsproviderid=190009003H&$date=2019-10-14&$type=INFO';

//            $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/notifications?$ccsproviderid=' . $id . '&$date=' . $date . '&$type=INFO';

            if (auth()->user()->isBranchUser()) {

                $url = $url.'$ccsserviceid='.$id.'&$sdate='.$sDate.'&$edate='.$eDate;
            } else {
                $url = $url.'$ccsproviderid='.$id.'&$sdate='.$sDate.'&$edate='.$eDate;
            }

            if(array_key_exists('type', $filters) && array_key_exists('source',$filters) && isset($filters->type) && isset($filters->source))
            {
                // \Log::info('All Filters');
                $url = $url.'&$type='.$type.'&$source='.$source;
            }
            else if(array_key_exists('type', $filters) && isset($filters->type))
            {
                // \Log::info('Date and Type only');
                $url = $url.'&$type='.$type;
            }
            else if(array_key_exists ('source',$filters) && isset($filters->source))
            {
                // \Log::info('Date and Source only');
                $url = $url.'&$source='.$source;
            }

            // $url = Helpers::getConfig('ccs_operation.get_message_list', AWSConfigType::API_GATEWAY).'$ccsproviderid=' . $id . '&$date=' . $date . '&$type=INFO';
            // Log::info($url);
            $client = new Client();

            $response1 = $client->request('GET', $url,
                [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => $auth_person_id,
                    ],
                ]);

            $body = $response1->getBody()->getContents();

            $res = json_decode($body, true);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $res
                ),
                RequestType::CODE_201
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

    public function entitlementHistory(Request $request)
    {
        $data = $this->ccsEntitlementRepo->list([], $request);

        return (new CCSEntitlementResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function ccsNotificationDashboard(Request $request)
    {
        try{
            $waitlistCount = 0;
            $enroledCount = 0;
            $organization_id = auth()->user()->organization_id;
            $weekStart = $request->input('weekStart');
            $weekEnd = $request->input('weekEnd');

            if(auth()->user()->hasOwnerAccess()){
                $branch_id = ($request->input('branch_id') != null)? Helpers::decodeHashedID($request->input('branch_id')): null;
            }else{
                $branch_id = auth()->user()->branch_id;
            }

            if($branch_id != null){
                $CCSEntitlementVariedForDay = CCSEntitlement::where('organization_id', $organization_id)->where('branch_id', $branch_id)->where('date', $request->input('date'))->where('ccs_varied', true)->count();
                $CCSEntitlementVariedTotal = CCSEntitlement::where('organization_id', $organization_id)->where('branch_id', $branch_id)->where('ccs_varied', true)->whereBetween('date',[$weekStart, $weekEnd])->count();
                //$enroledCount = WaitListEnrollment::where('organization_id', $organization_id)->where('branch_id', $branch_id)->where('status',2)->count();

            } else{
                $CCSEntitlementVariedForDay = CCSEntitlement::where('organization_id', $organization_id)->where('date', $request->input('date'))->where('ccs_varied', true)->count();
                $CCSEntitlementVariedTotal = CCSEntitlement::where('organization_id', $organization_id)->where('ccs_varied', true)->whereBetween('date',[$weekStart, $weekEnd])->count();
                // $enroledCount = WaitListEnrollment::where('organization_id', $organization_id)->where('status',2)->count();

            }

            $waitlistData = [
                'CCSEntitlementVariedForDay' => $CCSEntitlementVariedForDay,
                'CCSEntitlementVariedTotal' => $CCSEntitlementVariedTotal,
            ];

            return $waitlistData;
        }
        catch(Exception $e){
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

    public function getCorrespondeceList(Request $request)
    {

        try {

            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $sDate = null;
            $eDate = null;

            if (!is_null($filters)) {

                if (isset($filters->sDate) && $filters->sDate) {
                    $sDate = $filters->sDate;
                }

                if (isset($filters->eDate) && $filters->eDate) {
                    $eDate = $filters->eDate;
                }

            }


            if (auth()->user()->isBranchUser()) {
                $id = auth()->user()->branch->providerService->service_id;
                $auth_person_id = auth()->user()->ccs_id;
                $url = Helpers::getConfig('ccs_operation.get_correspondece_list', AWSConfigType::API_GATEWAY).'$ccsserviceid=' . $id . '&$sdate=' . $sDate . '&$edate=' . $eDate . '';
                
            } else {

                if ($filters && Helpers::IsNullOrEmpty($filters->provider_id)) {

                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'Please select provider'
                        ),
                        RequestType::CODE_400
                    );

                }

                $ccsProvider = $this->providerRepo->findById(Helpers::decodeHashedID($filters->provider_id), []);
                $ccsOrg = $this->ccsSetupRepo->findByProvider($ccsProvider->id, []);

                $id = $ccsProvider->provider_id;
                $auth_person_id = $ccsOrg->person_id;
                $url = Helpers::getConfig('ccs_operation.get_correspondece_list', AWSConfigType::API_GATEWAY).'$ccsproviderid=' . $id . '&$sdate=' . $sDate . '&$edate=' . $eDate . '';
            }



            // Log::info($url);
            if (is_null($sDate) || is_null($id) || is_null($eDate)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            // Log::info($sDate);
            // Log::info($eDate);

            // $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist?$ccsproviderid=190009003H&$sdate=2018-05-06&$edate=2019-06-06';

            // $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist?$ccsproviderid=' . $id . '&$sdate=' . $sDate . '&$edate=' . $eDate . '';
            $client = new Client();

            $response1 = $client->request('GET', $url,
                [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => $auth_person_id,
                    ],
                ]);

            $body = $response1->getBody()->getContents();

            $res = json_decode($body, true);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $res
                ),
                RequestType::CODE_201
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

    public function getCorrespondece(Request $request)
    {

        try {

            $link = (!Helpers::IsNullOrEmpty($request->input('link'))) ? json_decode($request->input('link')) : null;



            // Log::info($link);
            $midLink = substr($link, 1, -1);

            $fullLink = rawurlencode($link);

            if (is_null($link)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            if (auth()->user()->hasSiteManagerAccess()) {

                $ccsOrg = $this->ccsSetupRepo->findByUser(auth()->user()->id, []);
                $ccsProvider = $this->providerRepo->findByUser(auth()->user()->id, []);

                $id = $ccsProvider->provider_id;
                $auth_person_id = $ccsOrg->person_id;
                $url = Helpers::getConfig('ccs_operation.get_correspondece', AWSConfigType::API_GATEWAY).'$ccsproviderid='. $id .'&$link='.$fullLink;

            } else {
                $id = auth()->user()->branch->providerService->service_id;
                $auth_person_id = auth()->user()->ccs_id;
                $url = Helpers::getConfig('ccs_operation.get_correspondece', AWSConfigType::API_GATEWAY).'$ccsserviceid='. $id .'&$link='.$fullLink;
            }



            // $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist/link?$ccsproviderid=190009003H&$link=%7BBDFBEF75-9E98-4EBA-8991-5B206F5E3CAC%7D';

            // $url = 'https://4zpy51wbuk.execute-api.ap-southeast-2.amazonaws.com/ccsdev/correspondenceslist/link?$ccsproviderid=' . $id . '&$link=' . $fullLink;
            $client = new Client();

            $response1 = $client->request('GET', $url,
                [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => $auth_person_id,
                    ],
                ]);

            $body = $response1->getBody()->getContents();

            $res = json_decode($body, true);

            if (count($res['results']) < 1) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.api_failed')
                    ),
                    RequestType::CODE_404
                );
            }

            $pdfLink = $this->binaryToPdf($res, $midLink);

            // Log::info($pdfLink);
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $pdfLink
                ),
                RequestType::CODE_201
            );

            // return response()->json(
            //     RequestHelper::sendResponse(
            //         RequestType::CODE_404,
            //         LocalizationHelper::getTranslatedText('system.resource_not_found')
            //     ),
            //     RequestType::CODE_404
            // );

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

    public function binaryToPdf($data, $link)
    {
        // $encoded = rawurlencode("{");
        // Log::info($encoded);

        $bin = $data['results'][0]['attachmentContent'];
        if (is_null($bin) || $bin == '') {
            return '';
        }

        # Decode the Base64 string, making sure that it contains only valid characters
        $bin = base64_decode($bin, true);

        # Perform a basic validation to make sure that the result is a valid PDF file
        # Be aware! The magic number (file signature) is not 100% reliable solution to validate PDF files
        # Moreover, if you get Base64 from an untrusted source, you must sanitize the PDF contents

        if (strpos($bin, '%PDF') !== 0) {
            throw new Exception('Missing the PDF file signature');
        }

        # creating the unique file name
        $fileName = $link;

        #check alredy file exist or not
        $exists = Storage::disk('s3')->exists('Temp/' . $fileName . '.pdf');
        if (!$exists) {

            #writing the file in local

            #writing the file in s3
            Storage::disk('s3')->put('Temp/' . $fileName . '.pdf', $bin);

            // this will get file content
            // $fileContent = Storage::disk('s3')->get('binarypdf/'.$fileName. '.pdf');

            //gat file url
            $exists = Storage::disk('s3')->exists('Temp/' . $fileName . '.pdf');

            if ($exists) {

                // Log::info('success created');
                return Storage::disk('s3')->url('Temp/' . $fileName . '.pdf');
            } else {
                return '';
            }

            // return Storage::disk('s3')->download('binarypdf/' .$fileName. '.pdf');

        } else {

            // Log::info('file already exist');
            return Storage::disk('s3')->url('Temp/' . $fileName . '.pdf');


        }

    }
}
