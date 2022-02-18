<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use GuzzleHttp\Client;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\AlternativePayment;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\AlternativePaymentResourceCollection;
use Illuminate\Support\Facades\Validator;
use LocalizationHelper;
use RequestHelper;
use Aws\Sns\SnsClient;
use Aws\Credentials\Credentials;
use Illuminate\Support\Facades\Storage;
use Log;
use PathHelper;
use Carbon\Carbon;
use DB;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;

class DebtController extends Controller
{


    private $providerRepo;
    private $ccsSetupRepo;

    public function __construct(IProviderRepository $providerRepo, ICCSSetupRepository $ccsSetupRepo)
    {
        $this->providerRepo = $providerRepo;
        $this->ccsSetupRepo = $ccsSetupRepo;
    }

    /**
     * get alternative payment list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {

        try {

            //pagination
            // $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            // $data = $alternativePaymentObj;
            //search
            if (!is_null($searchValue)) {

                // $alternativePaymentObj->whereLike(['properties'], $searchValue);
            }

            $issuedDate = null;

            //filters
            if (!is_null($filters)) {
                if (isset($filters->issued_date) && !is_null($filters->issued_date)) {
                    $issuedDate = $filters->issued_date;
                }
            }

            if (auth()->user()->isBranchUser()) {

                $id = auth()->user()->branch->providerService->service_id;
                $auth_person_id = auth()->user()->ccs_id;
                $url = Helpers::getConfig('read_debt', AWSConfigType::API_GATEWAY).'?$ccsserviceid=' . $id . '&$ccsissueddate=' . $issuedDate;
                
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
                $url = Helpers::getConfig('read_debt', AWSConfigType::API_GATEWAY).'?$ccsproviderid=' . $id . '&$ccsissueddate=' . $issuedDate;
            }


            $client = new Client();

            // $url =  Helpers::getConfig('read_debt',AWSConfigType::API_GATEWAY).'?$ccsproviderid=' . $id . '&$ccsissueddate=' . $issuedDate;

            $res = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                    'authpersonid' => $auth_person_id,
                ]
            ]);


            $body = $res->getBody()->getContents();

            $resp_data = json_decode($body, true);

            return [
                'data' => $resp_data,
                'code' => RequestType::CODE_200
            ];
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

    /**
     * get alternative payment list
     * @param Request $request
     * @return JsonResponse
     */
    public function getApa(Request $request)
    {

        try {

            //pagination
            // $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            $alternativePaymentObj = AlternativePayment::with(['provider'])
                ->where('organization_id', '=', auth()->user()->organization_id)
                ->orderBy('created_at', 'desc');

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            // $data = $alternativePaymentObj;
            //search
            if (!is_null($searchValue)) {

                $alternativePaymentObj->whereLike(['properties'], $searchValue);
            }

            $issuedDate = null;
            $resp_data = [];

            //filters
            if (!is_null($filters)) {

                if (isset($filters->issued_date) && !is_null($filters->issued_date)) {
                    $issuedDate = $filters->issued_date;
                }

                if (isset($filters->provider_id) && $filters->provider_id) {
                    $alternativePaymentObj = $alternativePaymentObj->where('provider_setup_id', '=', Helpers::decodeHashedID($filters->provider_id));

                    $ccsProvider = $this->providerRepo->findById(Helpers::decodeHashedID($filters->provider_id), ['ccsSetup']);
                    $providerID = $ccsProvider->provider_id;

                    $client = new Client();

                    $url = Helpers::getConfig('read_alternative_payments',AWSConfigType::API_GATEWAY).'?$ccsproviderid=' . $providerID . '&$ccsdatesubmitted=' . $issuedDate;
                    $api_key = config('aws.gateway_api_key');
                    $res = $client->request('GET', $url, [
                        'headers' => [
                            'x-api-key' => $api_key,
                            'authpersonid' => $ccsProvider->ccsSetup->person_id,
                        ]
                    ]);

                    $body = $res->getBody()->getContents();

                    $resp_data = json_decode($body, true);
                }

            }

            $apiArray = array();

            $alternativePaymentObj = $alternativePaymentObj->get();


            return (new AlternativePaymentResourceCollection($alternativePaymentObj))
                ->additional([
                    'ApiData' => $resp_data,
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);


            // //check if any enrolment (curent) is active
            // $ccs_api_response = CCSHelpers::getChildEnrolment([
            //     'ccschildcrn' => $child->ccs_id,
            //     'ccsstatus' => 'CONFIR'
            // ]);


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

    public function create(Request $request)
    {

        DB::beginTransaction();

        try {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            // $validator = Validator::make($request->all(), [
            //     'providerID' => ['required'],
            //     'paymentArrangementType' => ['required'],
            //     'paymentArrangementStartDate' => ['required'],
            //     'evenAmountsPaymentPeriod' => ['required'],
            //     'offsettingArrangementServiceID' => ['required'],
            //     'offsettingArrangementPercentage' => ['required'],
            // ]);

            // if ($validator->fails()) {
            //     return response()->json(
            //         RequestHelper::sendResponse(
            //             RequestType::CODE_400,
            //             LocalizationHelper::getTranslatedText('system.missing_parameters')
            //         ),
            //         RequestType::CODE_400
            //     );
            // }

            $provider_setup_id = Helpers::decodeHashedID($request->input('provider_setup_id'));

            $ccsProvider = $this->providerRepo->findById($provider_setup_id, ['ccsSetup']);

            $API_properties =  [
                'providerID' => $ccsProvider->provider_id,
                'paymentArrangementType' => $request->input('paymentArrangementType'),
                'paymentArrangementStartDate' => $request->input('paymentArrangementStartDate'),
                'evenAmountsPaymentPeriod' => $request->input('evenAmountsPaymentPeriod'),
                'offsettingArrangementServiceID' => $request->input('offsettingArrangementServiceID'),
                'offsettingArrangementPercentage' => $request->input('offsettingArrangementPercentage'),
            ];


            $alternativePaymentData =  new AlternativePayment();
            $alternativePaymentData->provider_setup_id = $provider_setup_id;
            $alternativePaymentData->organization_id = auth()->user()->organization_id;
            $alternativePaymentData->properties =  $API_properties;
            $alternativePaymentData->created_by =  auth()->user()->id;
            $alternativePaymentData->is_synced =  '0';

            $alternativePaymentData->save();

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $alternativePaymentData->organization_id,
                "subjectid" => $alternativePaymentData->id,
                "authpersonid" => $ccsProvider->ccsSetup->person_id,
                "action" => "New Alternative Payment Arrangement",
                "ccssetupid" => $ccsProvider->ccsSetup->id
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('alternative_payments', AWSConfigType::SNS),
                'Subject' => 'New Alternative Payment Arrangement (SNS)'
            ]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
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

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            // $validator = Validator::make($request->all(), [
            //     'providerID' => ['required'],
            //     'paymentArrangementType' => ['required'],
            //     'paymentArrangementStartDate' => ['required'],
            //     'evenAmountsPaymentPeriod' => ['required'],
            //     'offsettingArrangementServiceID' => ['required'],
            //     'offsettingArrangementPercentage' => ['required'],
            // ]);

            // if ($validator->fails()) {
            //     return response()->json(
            //         RequestHelper::sendResponse(
            //             RequestType::CODE_400,
            //             LocalizationHelper::getTranslatedText('system.missing_parameters')
            //         ),
            //         RequestType::CODE_400
            //     );
            // }

            $alternativePaymentData = AlternativePayment::findOrFail(Helpers::decodeHashedID($request->input('id')));

            $ccsProvider = $this->providerRepo->findById($alternativePaymentData->provider_setup_id, ['ccsSetup']);

            $API_properties =  [
                'providerID' =>  $ccsProvider->provider_id,
                'paymentArrangementType' => $request->input('paymentArrangementType'),
                'paymentArrangementStartDate' => $request->input('paymentArrangementStartDate'),
                'evenAmountsPaymentPeriod' => $request->input('evenAmountsPaymentPeriod'),
                'offsettingArrangementServiceID' => $request->input('offsettingArrangementServiceID'),
                'offsettingArrangementPercentage' => $request->input('offsettingArrangementPercentage'),
            ];

            $alternativePaymentData->provider_setup_id = $ccsProvider->id;
            $alternativePaymentData->properties =  $API_properties;
            $alternativePaymentData->created_by =  auth()->user()->id;
            $alternativePaymentData->is_synced =  '0';

            $alternativePaymentData->save();

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $alternativePaymentData->organization_id,
                "subjectid" => $alternativePaymentData->id,
                "authpersonid" => $ccsProvider->ccsSetup->person_id,
                "action" => "Edit Alternative Payment Arrangement",
                "ccssetupid" => $ccsProvider->ccsSetup->id
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('alternative_payments', AWSConfigType::SNS),
                'Subject' => 'Edit Alternative Payment Arrangement (SNS)'
            ]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
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

    public function documentUpload(Request $request)
    {

        DB::beginTransaction();

        try {
            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'supportingDocInput' => ['required'],
            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $selectedItem = [];
            $supportingDocuments = $request->input('supportingDocInput') ? $request->input('supportingDocInput') : [];
            $alternativePaymentArrangementID = $request->input('alternativePaymentArrangementID');

            foreach ($supportingDocuments as $document) {
                $document['ID'] = $alternativePaymentArrangementID;
                $document['documentType'] = 'DBT001';
                array_push($selectedItem, $document);
            }

            $alternativePaymentData = AlternativePayment::where('alternativePaymentArrangementID','=',$alternativePaymentArrangementID)->get()->first();

            if($alternativePaymentData != null) {

                $ccsProvider = $this->providerRepo->findById($alternativePaymentData->provider_setup_id, ['ccsSetup']);

                $alternativePaymentData->supporting_doc = json_encode($selectedItem); //json_encode($request->input('supportingDocInput')); //'1';
                $alternativePaymentData->is_synced =  '0';

            } else {
                $ccsProvider = $this->providerRepo->findById(Helpers::decodeHashedID($request->input('provider_setup_id')), ['ccsSetup']);

                $API_properties =  [
                    'providerID' => $ccsProvider->provider_id,
                    'paymentArrangementType' => $request->input('paymentArrangementType'),
                    'paymentArrangementStartDate' => $request->input('paymentArrangementStartDate'),
                    'evenAmountsPaymentPeriod' => $request->input('evenAmountsPaymentPeriod'),
                    'offsettingArrangementServiceID' => $request->input('offsettingArrangementServiceID'),
                    'offsettingArrangementPercentage' => $request->input('offsettingArrangementPercentage'),
                ];

                $alternativePaymentData =  new AlternativePayment();
                $alternativePaymentData->organization_id = auth()->user()->organization_id;
                $alternativePaymentData->provider_setup_id = $ccsProvider->id;
                $alternativePaymentData->alternativePaymentArrangementID =  $alternativePaymentArrangementID;
                $alternativePaymentData->properties =  $API_properties;
                $alternativePaymentData->created_by =  auth()->user()->id;
                $alternativePaymentData->supporting_doc = json_encode($selectedItem); //json_encode($request->input('supportingDocInput')); //'1';
                $alternativePaymentData->is_synced =  '0';

            }

            $alternativePaymentData->save();

            DB::commit();


            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $alternativePaymentData->organization_id,
                "subjectid" => $alternativePaymentData->id,
                "authpersonid" => $ccsProvider->ccsSetup->person_id,
                "action" => "Upload Alternative Payment Arrangement Supporting Documents"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('alternative_payments_upload_doc', AWSConfigType::SNS),
                'Subject' => 'Upload Alternative Payment Arrangement Supporting Documents (SNS)'
            ]);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
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
}
