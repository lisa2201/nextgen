<?php

namespace Kinderm8\Http\Controllers;

use CCMSHelper;
use GuzzleHttp\Client;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Kinderm8\CCSEnrolment;
use Kinderm8\Child;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\ISCaseClaimSubmissionResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\ISCaseClaimSubmission;
use Kinderm8\User;
use LocalizationHelper;
use Ramsey\Uuid\Uuid;
use RequestHelper;

class ISCaseController extends Controller
{

    public function listISCases(Request $request)
    {

        try {

            // pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

            $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ? (int) $request->get('page') : 1;

            // filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;


            $service = auth()->user()->branch->providerService;

            $serviceId = $service->service_id;


            $url = config('dss.inclusive_support_cases_list');

            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $credentials = CCMSHelper::getCCMSAuth($service);
            $systemcode = config('dss.source_system_code');

            $client = new Client();

            // Log::info('-----------------List IS Cases---------------------');

            $queryParams = [
                'TransactionId' => $transaction_id,
                'SourceSystemCode' => $systemcode,
                'ApprovalId' => $serviceId,
                'PageSize' => $offset,
                'PageNumber' => $page,
            ];

            // filter actions
            if (!is_null($filters)) {

                if (isset($filters->case_id) && !empty($filters->case_id)) {
                    $queryParams['ISCaseId'] = $filters->case_id;
                }

                if (isset($filters->case_type) && !empty($filters->case_type)) {
                    $queryParams['ISCaseType'] = $filters->case_type;
                }

                if (isset($filters->status) && !empty($filters->status)) {
                    $queryParams['Status'] = $filters->status;
                }

                if (isset($filters->start_date) && !empty($filters->start_date)) {

                    $queryParams['ISStartDateFrom'] = $filters->start_date;

                    if (isset($filters->end_date) && !empty($filters->end_date)) {
                        $queryParams['ISEndDateTo'] = $filters->end_date;
                    }

                }


            }

            // Log::info('---List IS Cases API Request Body---');
            // Log::info($queryParams);

            // Log::info('---List IS Cases credentials---');
            // Log::info($credentials);

            $response = $client->post($url, [
                'auth' => [
                    $credentials['user_name'],
                    $credentials['password']
                ],
                'query' => $queryParams
            ]);

            $caseResponse = $response->getBody()->getContents();
            $caseResponse = json_decode($caseResponse, true);

            // Log::info('---List IS Cases API Response---');
            // Log::info($caseResponse);

            if ($caseResponse) {

                if (array_key_exists('ReturnCode', $caseResponse) && $caseResponse['ReturnCode'] != 0) {

                    if ($caseResponse['ReturnCode'] == 1) {
                        Log::info('No records found for IS Cases');
                        $caseResponse = [];
                    } else {
                        Log::info($caseResponse);
                        throw new Exception($caseResponse['ReturnMessage'], 1000);
                    }

                } else if (array_key_exists('FaultCode', $caseResponse)) {
                    Log::info($caseResponse);
                    throw new Exception($caseResponse['FaultText'], 1000);
                } else {
                    $caseResponse = CCMSHelper::formatInclusiveSupportCase($caseResponse);
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

    public function listISCasesClaims(Request $request)
    {

        try {

            // pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

            $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ? (int) $request->get('page') : 1;

            // filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $service = auth()->user()->branch->providerService;
            $serviceId = $service->service_id;
            $credentials = CCMSHelper::getCCMSAuth($service);

            $client = new Client();

            $url = config('dss.inclusive_support_cases_claims_list');

            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $systemcode = config('dss.source_system_code');

            // Log::info('-----------------List IS Case Claims---------------------');

            $queryParams = [
                'TransactionId' => $transaction_id,
                'SourceSystemCode' => $systemcode,
                'ApprovalId' => $serviceId,
                'PageSize' => $offset,
                'PageNumber' => $page,
            ];

            // filter actions
            if (!is_null($filters)) {

                if (isset($filters->case_id) && !empty($filters->case_id)) {
                    $queryParams['ISCaseId'] = $filters->case_id;
                }

                if (isset($filters->case_type) && !empty($filters->case_type)) {
                    $queryParams['ISCaseType'] = $filters->case_type;
                }

                if (isset($filters->claim_id) && !empty($filters->claim_id)) {
                    $queryParams['ISCaseClaimId'] = $filters->claim_id;
                }

                if (isset($filters->claim_reference) && !empty($filters->claim_reference)) {
                    $queryParams['ServiceProviderISCaseClaimReference'] = $filters->claim_reference;
                }

                if (isset($filters->week_ending) && !empty($filters->week_ending)) {
                    $queryParams['WeekEnding'] = $filters->week_ending;
                }

                if (isset($filters->status) && !empty($filters->status)) {
                    $queryParams['ISCaseClaimStatus'] = $filters->status;
                }

                if (isset($filters->updated_since) && !empty($filters->updated_since)) {
                    $queryParams['UpdatedSince'] = $filters->updated_since;
                }

            }

            // Log::info('---List IS Case Claims API Request Body---');
            // Log::info($queryParams);

            $response = $client->post($url, [
                'auth' => [
                    $credentials['user_name'],
                    $credentials['password']
                ],
                'query' => $queryParams
            ]);

            $caseClaimResponse = $response->getBody()->getContents();
            $caseClaimResponse = json_decode($caseClaimResponse, true);

            // Log::info('---List IS Case Claim API Response---');
            // Log::info($caseClaimResponse);

            if ($caseClaimResponse) {

                if (array_key_exists('ReturnCode', $caseClaimResponse) && $caseClaimResponse['ReturnCode'] != 0) {

                    if ($caseClaimResponse['ReturnCode'] == 1) {
                        Log::info('No records found for IS Case Claims');
                        $caseClaimResponse = [];
                    } else {
                        Log::info($caseClaimResponse);
                        throw new Exception($caseClaimResponse['ReturnMessage'], 1000);
                    }

                } else if (array_key_exists('FaultCode', $caseClaimResponse)) {
                    Log::info($caseClaimResponse);
                    throw new Exception($caseClaimResponse['FaultText'], 1000);
                }

            } else {
                // Log::info('Empty response from API');
                throw new Exception(LocalizationHelper::getTranslatedText('response.empty_response_from_api'), 1000);
                $caseClaimResponse = [];
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $caseClaimResponse
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

    public function addIsClaimDependency(Request $request)
    {

        try {

            $enrolment_ids = $request->has('enrolment_ids') ? $request->input('enrolment_ids') : [];

            $educatorList = User::where('branch_id', '=', auth()->user()->branch_id)
                ->whereHas('roles', function ($query) {
                    $query->where('type', '!=', RoleType::PARENTSPORTAL);
                })
                ->get();

            $childrenList = Child::
                whereHas('ccs_enrolment', $enrolmentFilter = function ($query) use($enrolment_ids) {
                    $query->whereIn('enrolment_id', $enrolment_ids)->where('status', 'CONFIR');
                })
                ->with(['ccs_enrolment' => $enrolmentFilter])
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'educators' => new UserResourceCollection($educatorList),
                        'children' => new ChildResourceCollection($childrenList)
                    ]
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

    public function createISCaseClaim(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'educators_declaration' => ['required'],
                'payment_type' => ['required'],
                'service_provision' => ['required'],
                'hours_claimed' => ['required'],
                'enrolments' => Rule::requiredIf($request->input('service_provision') === 'Face-to-Face'),
                'week_ending' => ['required'],
                'week_days' => ['required'],
                'case_id' => ['required'],
                'is_case' => ['required'],
                'submission_id' => Rule::requiredIf($request->has('edit') && $request->input('edit') === true)
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

            $service = auth()->user()->branch->providerService;
            $serviceId = $service->service_id;

            $edit_mode = ($request->has('edit') && $request->input('edit') === true) ? true : false;
            $submission_data = null;

            if ($edit_mode) {

                $submission_data = ISCaseClaimSubmission::findOrfail(Helpers::decodeHashedID($request->input('submission_id')));

                ISCaseClaimSubmission::where('case_id', '=', $submission_data->case_id)
                    ->where('case_claim_reference', '=', $submission_data->case_claim_reference)
                    ->update(['status' => 'discarded']);

            }

            $user = auth()->user();
            $educators_declaration = $request->input('educators_declaration');
            $payment_type = $request->input('payment_type');
            $service_provision = $request->input('service_provision');
            $hours_claimed = $request->input('hours_claimed');
            $enrolments = $request->input('enrolments');
            $week_ending = $request->input('week_ending');
            $week_days = $request->input('week_days');
            $case_id = $request->input('case_id');
            $is_case = $request->input('is_case');
            $claim_ref = $edit_mode ? $submission_data->case_claim_reference : Uuid::uuid4()->toString();
            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $credentials = CCMSHelper::getCCMSAuth($service);

            // Log::info('-----------------Create IS Case Claim---------------------');

            $newISClaim = [
                'ApprovalId' => $serviceId,
                'ISCaseId' => $case_id,
                'ServiceProviderISCaseClaimReference' => $claim_ref,
                'WeekEnding' => $week_ending,
                'ISPaymentType' => $payment_type,
                'ServiceProvision' => $service_provision,
                'HoursClaimed' => $hours_claimed,
                'AuthorisedPersonFirstName' => $credentials['auth_person_first_name'],
                'AuthorisedPersonLastName' => $credentials['auth_person_last_name'],
                'AuthorisedPersonId' => $credentials['auth_person_id'],
            ];

            $additional_educators_array = [];

            foreach ($week_days as $day_obj) {

                if (array_key_exists('educatorArray', $day_obj) && is_array($day_obj['educatorArray']) && count($day_obj['educatorArray']) > 0) {

                    foreach ($day_obj['educatorArray'] as $educator_obj) {

                        $additional_obj = [
                            'AdditionalEducatorId' => $educator_obj['ccs_id'] ? $educator_obj['ccs_id'] : "",
                            'AdditionalEducatorFirstName' => $educator_obj['first_name'],
                            'AdditionalEducatorLastName' => $educator_obj['last_name'],
                            'AdditionalEducatorHours' => $educator_obj['hours_claimed'],
                            'CareDate' => $day_obj['date']
                        ];

                        array_push($additional_educators_array, $additional_obj);

                    }

                }

            }

            if (count($additional_educators_array) > 0) {

                if ($educators_declaration === false) {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'Additional educators declaration not provided'
                        ),
                        RequestType::CODE_400
                    );
                }

                $newISClaim['AdditionalEducatorDeclaration'] = "Y";

            } else {
                $newISClaim['AdditionalEducatorDeclaration'] = "N";
            }

            $newISClaim['ListOfAdditionalEducators'] = ['AdditionalEducators' => $additional_educators_array];

            $enrolment_array = [];

            if ($enrolments && is_array($enrolments) && count($enrolments) > 0) {

                foreach ($enrolments as $enrol) {

                    array_push($enrolment_array, [
                        'EnrolmentId' => $enrol
                    ]);

                }

            }

            $newISClaim['ListOfEnrolments'] = ['Enrolment' => $enrolment_array];

            $url = config('dss.inclusive_support_cases_claim_create');

            $systemcode = config('dss.source_system_code');

            $postObj = [
                'TransactionId' => $transaction_id,
                'SourceSystemCode' => $systemcode,
                'NewISCaseClaim' => $newISClaim
            ];

            $claimSubmission = new ISCaseClaimSubmission();
            $claimSubmission->organization_id = $user->organization_id;
            $claimSubmission->branch_id = $user->branch_id;
            $claimSubmission->created_by = $user->id;
            $claimSubmission->case_id = $case_id;
            $claimSubmission->transaction_id = $transaction_id;
            $claimSubmission->case_claim_reference = $claim_ref;
            $claimSubmission->hours_claimed = $hours_claimed;
            $claimSubmission->payment_type = $payment_type;
            $claimSubmission->service_provision = $service_provision;
            $claimSubmission->week_ending = $week_ending;
            $claimSubmission->enrolments = $enrolments;
            $claimSubmission->week_days = $week_days;
            $claimSubmission->is_case = $is_case;

            $request_error = false;
            $submit_error = false;
            $submit_fault = false;

            $error_obj = null;
            $result = null;

            $client = new Client();

            // Log::info('---Create IS Case Claim API Request Body---');
            // Log::info($postObj);

            try {

                $response = $client->put($url, [
                    'auth' => [
                        $credentials['user_name'],
                        $credentials['password']
                    ],
                    'json' => $postObj
                ]);

                $submitResponse = $response->getBody()->getContents();
                $submitResponse = json_decode($submitResponse, true);

                // Log::info('---Create IS Case Claim API Response---');
                // Log::info($submitResponse);

                if (array_key_exists('ReturnCode', $submitResponse) && $submitResponse['ReturnCode'] != 0) {
                    $submit_error = true;
                    $error_obj = $submitResponse;
                } else if (array_key_exists('FaultCode', $submitResponse)) {
                    $submit_fault = true;
                    $error_obj = $submitResponse;
                }

                $result = $submitResponse;

            } catch (Exception $exception) {

                $request_error = true;
                $error_obj = $exception;

            }

            if ($request_error === true) {

                // Log::info('Request Error');

                $claimSubmission->response = ['response' => $error_obj];
                $claimSubmission->fail_reason = $error_obj->getMessage();
                $claimSubmission->status = 'failed';
                $claimSubmission->save();

                throw new Exception($error_obj->getMessage(), $error_obj->getCode());

            } else if ($submit_error === true) {

                // Log::info('Submit Error');
                $claimSubmission->response = ['response' => $error_obj];
                $claimSubmission->fail_reason = $error_obj['ReturnMessage'];
                $claimSubmission->status = 'failed';
                $claimSubmission->save();

                // Log::info($error_obj);
                throw new Exception($error_obj['ReturnMessage'], 1000);

            } else if ($submit_fault === true) {

                // Log::info('Submit Fault Error');
                $claimSubmission->response = ['response' => $error_obj];
                $claimSubmission->fail_reason = $error_obj['FaultText'];
                $claimSubmission->status = 'failed';
                $claimSubmission->save();

                // Log::info($error_obj);
                throw new Exception($error_obj['FaultText'], 1000);

            } else {

                // Log::info('Post success');
                // Log::info($result);
                $claimSubmission->response = is_null($result) ? null : ['response' => $result];
                $claimSubmission->fail_reason = null;
                $claimSubmission->status = 'submitted';
                $claimSubmission->save();

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('ccms.success_create_case_claim')
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

    public function cancelISCaseClaim(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'case_id' => ['required'],
                'claim_id' => ['required']
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

            // Log::info('-----------------Cancel IS Claim---------------------');

            $user = auth()->user();
            $service = auth()->user()->branch->providerService;
            $service_id = $service->service_id;
            $credentials = CCMSHelper::getCCMSAuth($service);
            $case_id = $request->input('case_id');
            $claim_id = $request->input('claim_id');
            $transaction_id = CCMSHelper::ccmsTransactionID($request);
            $url = config('dss.inclusive_support_cases_claim_cancel');

            $cancel_obj = [
                'ApprovalId' => $service_id,
                'ISCaseId' => $case_id,
                'ISCaseClaimId' => $claim_id,
                'AuthorisedPersonFirstName' => $credentials['auth_person_first_name'],
                'AuthorisedPersonLastName' => $credentials['auth_person_last_name'],
                'AuthorisedPersonId' => $credentials['auth_person_id'],
            ];

            $systemcode = config('dss.source_system_code');

            $request_body = [
                'TransactionId' => $transaction_id,
                'SourceSystemCode' => $systemcode,
                'ISCaseClaimCancellation' => $cancel_obj
            ];

            // Log::info('---Cancel IS Claim Request---');
            // Log::info($request_body);

            $client = new Client();

            $response = $client->post($url, [
                'auth' => [
                    $credentials['user_name'],
                    $credentials['password']
                ],
                'json' => $request_body
            ]);

            $cancelResponse = $response->getBody()->getContents();
            $cancelResponse = json_decode($cancelResponse, true);

            // Log::info('---Cancel IS Claim Response---');
            // Log::info($cancelResponse);

            if (array_key_exists('ReturnCode', $cancelResponse) && $cancelResponse['ReturnCode'] != 0) {
                throw new Exception($cancelResponse['ReturnMessage'], 1000);
            } else if (array_key_exists('FaultCode', $cancelResponse)) {
                throw new Exception($cancelResponse['FaultText'], 1000);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('ccms.success_cancel_case_claim')
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

    public function listFailedSubmissions(Request $request)
    {

        $actualCount = 0;

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->get('search'))) ? Helpers::sanitizeInputString($request->get('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->get('sort')) && is_null($searchValue)) ? json_decode($request->get('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            //query builder
            $failed_submissions = ISCaseClaimSubmission::where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->where('status', '=', 'failed');

            //get actual count
            $actualCount = $failed_submissions->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->case_id) && !empty($filters->case_id)) {
                    $failed_submissions->where('case_id', $filters->case_id);
                }

                if (isset($filters->claim_reference) && !empty($filters->claim_reference)) {
                    $failed_submissions->where('case_claim_reference', $filters->claim_reference);
                }

                if (isset($filters->week_ending) && !empty($filters->week_ending)) {
                    $failed_submissions->where('week_ending', $filters->week_ending);
                }

            }

            //search
            if (!is_null($searchValue)) {
                $failed_submissions->whereLike([
                    'case_id',
                    'case_claim_reference'
                ], $searchValue);
            }

            //sorting
            // if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
            //     $adjustment_items->orderBy(
            //         Arr::get($this->sortColumnsMap, $sortOption->key),
            //         Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
            //     );
            // } else {
            //     $adjustment_items->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            // }

            $failed_submissions = $failed_submissions
                ->paginate($offset);

            return (new ISCaseClaimSubmissionResourceCollection($failed_submissions, []))
                ->additional([
                    'totalRecords' => $actualCount
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

    public function deleteCaseClaimSubmission(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'id' => ['required']
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

            $id = Helpers::decodeHashedID($request->input('id'));
            $submission = ISCaseClaimSubmission::findOrFail($id);
            $submission->delete();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
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
