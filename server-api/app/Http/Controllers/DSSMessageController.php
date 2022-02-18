<?php

namespace Kinderm8\Http\Controllers;

use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Log;
use ErrorHandler;
use Helpers;
use Aws\Sns\SnsClient;
use Carbon\Carbon;
use Kinderm8\Branch;
use RequestHelper;
use LocalizationHelper;
use CCMSHelper;
use Aws\Credentials\Credentials;
use Illuminate\Support\Facades\Crypt;
use Exception;

class DSSMessageController extends Controller
{

    public function get(Request $request)
    {
        $messageList = [];
        $actualCount = 0;
        $displayCount = 0;
        $filters = null;

        try
        {

            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 10;

           $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ? (int) $request->get('page') : 1;

           // filters
           $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters'), true) : null;
            //portal admin
            // if (auth()->user()->hasRole('portal-admin'))
            // {
            //     $serviceId = '';
            // }
            if (auth()->user()->hasOwnerAccess())
            {
                $findBranch = Branch::find(Helpers::decodeHashedID($filters['branch']));
                $serviceId = $findBranch->providerService->service_id;
            }
            else
            {
                $serviceId = auth()->user()->branch->providerService->service_id;
            }


            // Log::info($offset);
            // Log::info(config('dss.source_system_code'));

            $client = new \GuzzleHttp\Client();

            $url =  config('aws.end_points.ccms_operation.get_messages');
            // $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/messages/json/retrievemessages';

            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $queryParams = [
                'TransactionId' => $transaction_id, //'QM280420202',
                'SourceSystemCode' => config('dss.source_system_code'), //'KINDv2.069hbk',
                'ApprovalId' => $serviceId,
                'PageSize' => $offset,
                'PageNumber' => $page,
            ];

                        // filter actions
            if (!is_null($filters)) {
                if (isset($filters['sDate']) && !empty($filters['sDate'])) {
                    $queryParams['StartDate'] = $filters['sDate'];
                }

                if (isset($filters['eDate']) && !empty($filters['eDate'])) {
                    $queryParams['EndDate'] = $filters['eDate'];
                }
                if (isset($filters['new']) && !empty($filters['new'])) {
                    $queryParams['OnlyNewMessages'] = $filters['new'];
                }

            }

            if(auth()->user()->branch->providerService->credentials) {

                $username = $password = null;
            if(array_key_exists('username',auth()->user()->branch->providerService->credentials))
            {
                $username = auth()->user()->branch->providerService->credentials['username'];
            }
            if(array_key_exists('password',auth()->user()->branch->providerService->credentials))
            {
                $password = Crypt::decryptString(auth()->user()->branch->providerService->credentials['password']);
            }
            if(!$username || !$password)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Please setup CCMS authentication details in CCMS connection section"
                    ),
                    RequestType::CODE_500
                );
            }
            }
            else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Please setup CCMS authentication details in CCMS connection section"
                    ),
                    RequestType::CODE_500
                );
            }
            // Log::info("username ===> ".$username. " password====> ".$password);

            $response = $client->post($url, [
                'auth' => [
                    $username,
                    $password
                ],
                'query' => $queryParams
            ]);

        // Log::info($queryParams);
        $messageList = $response->getBody()->getContents();
        $messageList = json_decode($messageList, true);
        // Log::info($messageList);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $messageList
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() != 0 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }



    }


    public function getInnovativeSolutionCases(Request $request)
    {

        try {

            // pagination
           $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 10;

           $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ? (int) $request->get('page') : 1;

           // filters
           $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters'), true) : null;
            //    $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters'),true) : null;


            // Service id from the front end
            // $serviceId = auth()->user()->branch->providerService->service_id;
            $serviceId = null;

            $client = new \GuzzleHttp\Client();

            $url =  config('aws.end_points.ccms_operation.getInnovativeSolutionCases');
            // $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/iscase/json/queryisinnovativesolutionscase';

            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $queryParams = [
                'TransactionId' => $transaction_id,//'QM280420202',
                'SourceSystemCode' => config('dss.source_system_code'), //'KINDv2.069hbk',
                'ApprovalId' => $serviceId,
                'PageSize' => $offset,
                'PageNumber' => $page,
            ];

            // filter actions
            if (!is_null($filters)) {

                if (isset($filters['service']) && !empty($filters['service'])) {
                    $serviceId = $filters['service'];
                    $queryParams['ApprovalId'] = $serviceId;
                }

                if (isset($filters['start_date_from']) && !empty($filters['start_date_from'])) {
                    $queryParams['StartDateFrom'] = $filters['start_date_from'];
                }

                if (isset($filters['start_date_to']) && !empty($filters['start_date_to'])) {
                    $queryParams['StartDateTo'] = $filters['start_date_to'];
                }

                if (isset($filters['end_date_from']) && !empty($filters['end_date_from'])) {
                    $queryParams['EndDateFrom'] = $filters['end_date_from'];
                }

                if (isset($filters['end_date_to']) && !empty($filters['end_date_to'])) {
                    $queryParams['EndDateTo'] = $filters['end_date_to'];
                }

                if (isset($filters['case_id']) && !empty($filters['case_id'])) {
                    $queryParams['CaseId'] = $filters['case_id'];
                }

            }

            if(auth()->user()->branch->providerService->credentials) {

                $username = $password = null;

                if(array_key_exists('username',auth()->user()->branch->providerService->credentials))
                {
                    $username = auth()->user()->branch->providerService->credentials['username'];
                }

                if(array_key_exists('password',auth()->user()->branch->providerService->credentials))
                {
                    $password = Crypt::decryptString(auth()->user()->branch->providerService->credentials['password']);
                }

                if(!$username || !$password)
                {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_500,
                            "Please setup CCMS authentication details in CCMS connection section"
                        ),
                        RequestType::CODE_500
                    );
                }

            }
            else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Please setup CCMS authentication details in CCMS connection section"
                    ),
                    RequestType::CODE_500
                );
            }

            if (!$serviceId) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Service id not provided"
                    ),
                    RequestType::CODE_500
                );
            }

            // Log::info($queryParams);

            $response = $client->post($url, [
                'auth' => [
                    $username, //'CCMS_KINDM8',
                    $password//'Childcare6!'
                ],
                'query' => $queryParams
            ]);

            $caseResponse = $response->getBody()->getContents();
            $caseResponse = json_decode($caseResponse, true);

            // Log::info($caseResponse);

            if ($caseResponse) {

                if (array_key_exists('ReturnCode', $caseResponse) && $caseResponse['ReturnCode'] != 0) {

                    if ($caseResponse['ReturnCode'] == 1) {
                        Log::info('No records found for Innovative Solution Cases');
                        $caseResponse = [];
                    } else {
                        Log::info($caseResponse);
                        throw new Exception($caseResponse['ReturnMessage'], 1000);
                    }

                } else if (array_key_exists('FaultCode', $caseResponse)) {
                    Log::info($caseResponse);
                    throw new Exception($caseResponse['FaultText'], 1000);
                }

            } else {
                // Log::info('Empty response from API');
                throw new Exception(LocalizationHelper::getTranslatedText('response.empty_response_from_api'), 1000);
                $caseResponse = [];
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $caseResponse
                ),
                RequestType::CODE_200
            );


        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }


    public function getInnovativeSolutionCasesClaims(Request $request)
    {

        try {

              // pagination
           $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 10;

           $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ? (int) $request->get('page') : 1;

           // filters
           $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters'), true) : null;

            // Service id
            $serviceId = auth()->user()->branch->providerService->service_id;

            $client = new \GuzzleHttp\Client();

            $url =  config('aws.end_points.ccms_operation.getInnovativeSolutionCasesClaims');
            // $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/iscaseclaim/json/queryisinnovativesolutionscaseclaim';

            $transaction_id = CCMSHelper::ccmsTransactionID($request);

            $queryParams = [
                'TransactionId' => $transaction_id, //'QM280420202',
                'SourceSystemCode' => config('dss.source_system_code'), //'KINDv2.069hbk',
                'ApprovalId' => $serviceId,
                'PageSize' => $offset,
                'PageNumber' => $page,
            ];
            // Log::info($offset);
            // filter actions
            if (!is_null($filters)) {
                if (isset($filters['case_id']) && !empty($filters['case_id'])) {
                    $queryParams['CaseId'] = $filters['case_id'];
                }
            }
            if (!is_null($filters)) {
                if (isset($filters['updated_since']) && !empty($filters['updated_since'])) {
                    $queryParams['UpdatedSince'] = $filters['updated_since'];
                }
            }
            if (!is_null($filters)) {
                if (isset($filters['status']) && !empty($filters['status'])) {
                    $queryParams['CaseClaimStatus'] = $filters['status'];
                }
            }
            if (!is_null($filters)) {
                if (isset($filters['case_claim_id']) && !empty($filters['case_claim_id'])) {
                    $queryParams['CaseClaimId'] = $filters['case_claim_id'];
                }
            }

            if(auth()->user()->branch->providerService->credentials) {

                $username = $password = null;
            if(array_key_exists('username',auth()->user()->branch->providerService->credentials))
            {
                $username = auth()->user()->branch->providerService->credentials['username'];
            }
            if(array_key_exists('password',auth()->user()->branch->providerService->credentials))
            {
                $password = Crypt::decryptString(auth()->user()->branch->providerService->credentials['password']);
            }
            if(!$username || !$password)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Please setup CCMS authentication details in CCMS connection section"
                    ),
                    RequestType::CODE_500
                );
            }
            }
            else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        "Please setup CCMS authentication details in CCMS connection section"
                    ),
                    RequestType::CODE_500
                );
            }

            // Log::info($queryParams);

            $response = $client->post($url, [
                'auth' => [
                    $username,//'CCMS_KINDM8',
                    $password //'Childcare6!'
                ],
                'query' => $queryParams
            ]);

            $caseResponse = $response->getBody()->getContents();
            $caseResponse = json_decode($caseResponse, true);

            // Log::info($caseResponse);

            if ($caseResponse) {

                if (array_key_exists('ReturnCode', $caseResponse) && $caseResponse['ReturnCode'] != 0) {

                    if ($caseResponse['ReturnCode'] == 1) {
                        Log::info('No records found for Innovative Solution Case Claims');
                        $caseResponse = [];
                    } else {
                        Log::info($caseResponse);
                        throw new Exception($caseResponse['ReturnMessage'], 1000);
                    }

                } else if (array_key_exists('FaultCode', $caseResponse)) {
                    Log::info($caseResponse);
                    throw new Exception($caseResponse['FaultText'], 1000);
                }

            } else {
                // Log::info('Empty response from API');
                throw new Exception(LocalizationHelper::getTranslatedText('response.empty_response_from_api'), 1000);
                $caseResponse = [];
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $caseResponse
                ),
                RequestType::CODE_200
            );


        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }
}
