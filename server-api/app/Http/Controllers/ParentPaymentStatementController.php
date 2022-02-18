<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Lambda\LambdaClient;
use Carbon\Carbon;
use DBHelper;
use ErrorHandler;
use Exception;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;
use Illuminate\Support\Facades\Validator;
use Helpers;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Kinderm8\Http\Resources\ParentPaymentStatementResourceCollection;
use Kinderm8\Http\Resources\ParentPaymentTransactionResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\ParentPaymentStatement;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\User;
use LocalizationHelper;
use \GuzzleHttp\Client;
use Illuminate\Validation\Rule;
use Kinderm8\Child;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Http\Resources\BranchResource;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Http\Resources\ParentPaymentMethodResource;
use Kinderm8\Http\Resources\ProviderSetupResource;
use Kinderm8\Http\Resources\ServiceSetupResource;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\ParentPaymentMethod;
use Kinderm8\ParentPaymentSchedule;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\SessionSubmission;
use Kinderm8\Traits\UserAccessibility;
use PaymentHelpers;

class ParentPaymentStatementController extends Controller
{

    private $ccsSetupRepo;
    private $serviceRepo;
    private $providerRepo;

    public function __construct(ICCSSetupRepository $ccsSetupRepo, IServiceRepository $serviceRepo, IProviderRepository $providerRepo)
    {
        $this->ccsSetupRepo = $ccsSetupRepo;
        $this->serviceRepo = $serviceRepo;
        $this->providerRepo = $providerRepo;
    }

    use UserAccessibility;

    private $sortColumnsMap = [
        'created_at' => 'km8_parent_payment_statements.created_at',
        'start_date' => 'km8_parent_payment_statements.start_date',
        'parent' => 'km8_users.first_name',
        'type' => 'km8_parent_payment_statements.generation_method',
        'amount' => 'km8_parent_payment_statements.amount'
    ];

    public function list(Request $request)
    {

        $actualCount = 0;
        $filters = null;

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $financial_statements = ParentPaymentStatement::with(['parent'])
                ->join('km8_users', 'km8_users.id', '=', 'km8_parent_payment_statements.parent_id')
                ->select('km8_parent_payment_statements.*');

            $financial_statements = $this->attachAccessibilityQuery($financial_statements, null, 'km8_parent_payment_statements');

            // if (auth()->user()->isAdministrative())
            // {
            //     $financial_statements->where('km8_parent_payment_statements.organization_id', '=', auth()->user()->organization_id)
            //         ->where('km8_parent_payment_statements.branch_id', '=', auth()->user()->branch_id);
            // }

            if(auth()->user()->isParent())
            {
                $financial_statements->where('km8_parent_payment_statements.organization_id', '=', auth()->user()->organization_id)
                    ->where('km8_parent_payment_statements.branch_id', '=', auth()->user()->branch_id)
                    ->where('km8_parent_payment_statements.parent_id', '=', auth()->user()->id);
            }

            //get actual count
            $actualCount = $financial_statements->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->start_date) && !empty($filters->start_date)) {
                    $financial_statements->where('km8_parent_payment_statements.start_date', '>=', $filters->start_date);
                }

                if (isset($filters->end_date) && !empty($filters->end_date)) {
                    $financial_statements->where('km8_parent_payment_statements.end_date','<=', $filters->end_date);
                }

                if (isset($filters->invoice_date) && !empty($filters->invoice_date)) {
                    $financial_statements->whereDate('km8_parent_payment_statements.created_at', '=', Carbon::createFromFormat('Y-m-d', $filters->invoice_date));
                }

                if (isset($filters->type) && $filters->type !== '0') {
                    $financial_statements->where('km8_parent_payment_statements.generation_method', $filters->type);
                }

                if (isset($filters->parent) && !empty($filters->parent)) {
                    $financial_statements->where('km8_users.id', '=', Helpers::decodeHashedID($filters->parent));
                }

                if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

                    $financial_statements->where('km8_users.status','=', $filters->parent_status);

                }

            }

            //search
            if (!is_null($searchValue)) {
                $financial_statements->whereLike([
                    'km8_users.first_name',
                    'km8_users.last_name',
                    'km8_parent_payment_statements.amount'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $financial_statements->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $financial_statements->orderBy('km8_parent_payment_statements.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $financial_statements = $financial_statements
                ->paginate($offset);

            return (new ParentPaymentStatementResourceCollection($financial_statements, []))
                ->additional([
                    'totalRecords' => $actualCount,
                    'filtered' => !is_null($filters)
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

    public function getParentsList(Request $request) {


        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $parent_list = User::whereHas('roles', function($query)
            {
                $query->where('type', RoleType::PARENTSPORTAL);
            })
            ->with([
                'child'
            ]);

            $parent_list = $this->attachAccessibilityQuery($parent_list);

            if (!is_null($filters)) {

                if (isset($filters->payment_schedule) && $filters->payment_schedule !== 'all') {

                    if ($filters->payment_schedule == 'no') {
                        $parent_list->whereDoesntHave('paymentSchedules', function($query) {
                            $query->where('status', '=', 'active')->orWhere('status', '=', 'upcoming');
                        });
                    }

                    if ($filters->payment_schedule == 'active' || $filters->payment_schedule == 'upcoming') {

                        if ($filters->payment_schedule == 'active') {
                            $parent_list->whereHas('paymentSchedules', function($query) {
                                $query->where('status', '=', 'active');
                            });
                        }

                        if ($filters->payment_schedule == 'upcoming') {
                            $parent_list->whereHas('paymentSchedules', function($query) {
                                $query->where('status', '=', 'upcoming');
                            });
                        }

                        if (isset($filters->payment_frequency) && $filters->payment_frequency) {
                            $parent_list->whereHas('paymentSchedules', function($query) use($filters) {
                                $query->where('payment_frequency', '=', $filters->payment_frequency);
                            });
                        }

                        if (isset($filters->billing_term) && $filters->billing_term) {
                            $parent_list->whereHas('paymentSchedules', function($query) use($filters) {
                                $query->where('billing_term', '=', $filters->billing_term);
                            });
                        }

                        if (isset($filters->payment_day) && $filters->payment_day) {
                            $parent_list->whereHas('paymentSchedules', function($query) use($filters) {
                                $query->where('payment_day', '=', $filters->payment_day);
                            });
                        }

                        if (isset($filters->auto_charge)) {
                            $parent_list->whereHas('paymentSchedules', function($query) use($filters) {
                                $query->where('auto_charge', '=', $filters->auto_charge ? true : false);
                            });
                        }

                    }

                }

                if (isset($filters->primary_payer) && $filters->primary_payer == true) {

                    $parent_list->whereHas('child', function($query) {
                        $query->where('primary_payer', '=', true);
                    });

                }

                if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

                    $parent_list->where('status', '=', $filters->parent_status);

                }

            }

            $parent_list = $parent_list->orderBy('first_name')->orderBy('last_name')->get();

            return (new UserResourceCollection($parent_list))->response()->setStatusCode(RequestType::CODE_200);

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

    public function getChildrenList(Request $request)
    {

        try {

            $require_user_id = false;

            if(!auth()->user()->isParent()) {
                $require_user_id = true;
            }

            $validator = Validator::make($request->all(), [
                'user_id' => Rule::requiredIf($require_user_id)
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

            $user_id = null;

            if ($require_user_id) {
                $user_id = Helpers::decodeHashedID($request->input('user_id'));
            } else {
                $user_id = auth()->user()->id;
            }

            $children = Child::whereHas('parents', function($query) use($user_id) {
                $query->where('user_id', '=', $user_id);
            })->get();

            return (new ChildResourceCollection($children, ['basic' => true]))
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

    public function entitlementStatementPdf(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'child_id' => ['required'],
                'start_date' => ['required'],
                'end_date' => ['required']
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

            $child_id = Helpers::decodeHashedID($request->input('child_id'));

            $start_date = Carbon::createFromFormat('Y-m-d', $request->input('start_date'));
            $end_date = Carbon::createFromFormat('Y-m-d', $request->input('end_date'));

            if($start_date->greaterThanOrEqualTo($end_date)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Invalid date range'
                    ),
                    RequestType::CODE_400
                );
            }

            $lambda = new LambdaClient([
                'region' => 'ap-southeast-2',
                'version' => '2015-03-31',
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $result = $lambda->invoke([
                'FunctionName' => 'nextgen-CCS-generateSessionSubsidyStatement', // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'child_id' => $child_id,
                    'start_date' => $request->input('start_date'),
                    'end_date' => $request->input('end_date')
                ]),
            ]);

            $res_payload = json_decode($result->get('Payload'), true);

            $file_url = null;

            if(array_key_exists('success', $res_payload) && $res_payload['success'] == true) {

                $file_url = $res_payload['url'];

                if ($file_url == 'false') {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'No records found for the details provided'
                        ),
                        RequestType::CODE_400
                    );
                }

            } else {
                throw new Exception('Error in Lambda');
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $file_url
                ),
                RequestType::CODE_200
            );


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

    public function parentStatementPreviewData(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'id' => ['required'],
                'start_date' => ['required'],
                'end_date' => ['required']
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

            $parent_id = Helpers::decodeHashedID($request->input('id'));
            $start_date = $request->input('start_date');
            $end_date = $request->input('end_date');
            $start_date_obj = Carbon::createFromFormat('Y-m-d', $start_date);
            $end_date_obj = Carbon::createFromFormat('Y-m-d', $end_date);

            $payment_plan = ParentPaymentSchedule::where('user_id', '=', $parent_id)->where('status', '=', 'active')->orderBy('id', 'desc')->first();

            $payment_date = $request->input('payment_date') ? $request->input('payment_date') : ($payment_plan ? $payment_plan->next_generation_date : null);

            $transaction_data =  ParentPaymentTransaction::with(['parent', 'child'])
                ->leftJoin('km8_parent_payment_adjustments', function ($join) {
                    $join->on('km8_parent_payment_adjustments.id', '=', 'km8_parent_payment_transactions.ref_id')
                        ->where('km8_parent_payment_transactions.transaction_type', '=','adjustment');
                })
                ->leftJoin('km8_parent_payment_adjustments_headers', function ($join) {
                    $join->on('km8_parent_payment_adjustments_headers.id', '=', 'km8_parent_payment_adjustments.adjustments_header_id')
                        ->where('km8_parent_payment_transactions.transaction_type', '=','adjustment');
                })
                ->leftJoin('km8_child_bookings', function ($join) {
                    $join->on('km8_child_bookings.id', '=', 'km8_parent_payment_transactions.ref_id')
                        ->where(function ($query) {
                            $query->where('km8_parent_payment_transactions.transaction_type', '=', 'fee')
                                ->orWhere('km8_parent_payment_transactions.transaction_type', '=', 'subsidy_estimate');
                        });
                })
                ->leftJoin('km8_adjustment_items', 'km8_adjustment_items.id', '=', 'km8_parent_payment_adjustments.item_id')
                ->leftJoin('km8_rooms', 'km8_child_bookings.room_id', '=', 'km8_rooms.id')
                ->where('km8_parent_payment_transactions.parent_id', $parent_id)
                ->where('km8_parent_payment_transactions.reversed', '=', false)
                ->orderBy('km8_parent_payment_transactions.date')
                ->orderBy('km8_parent_payment_transactions.id')
                ->select(
                    'km8_parent_payment_transactions.*',
                    'km8_adjustment_items.name AS item_name',
                    'km8_child_bookings.session_start',
                    'km8_child_bookings.session_end',
                    'km8_rooms.title as room_name',
                    'km8_parent_payment_adjustments_headers.properties AS adjustment_properties',
                    'km8_parent_payment_adjustments_headers.start_date AS adjustment_start_date',
                    'km8_parent_payment_adjustments_headers.end_date AS adjustment_end_date'
                )
                ->get();

            $recalculated = PaymentHelpers::recalculateTransaction($transaction_data, 0);

            $filteredTransactions = PaymentHelpers::filterTransactionDates($recalculated, $start_date, $end_date);

            if(count($filteredTransactions) === 0) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('payment.parent_statement_not_found')
                    ),
                    RequestType::CODE_400
                );

            }

            $opening_balance = 0;

            if (count($filteredTransactions) > 0) {

                $index = $filteredTransactions->first()['index_key'];

                if ($index === 0) {
                    $opening_balance = 0;
                } else {
                    $opening_balance = $recalculated[$index - 1]['running_total'];
                }

            }

            $totals = PaymentHelpers::getTransactionModeTotals($filteredTransactions);

            $debit_total = $totals['debit_total'];
            $credit_total = $totals['credit_total'];

            $absence_data = [];
            $entitlement_data = [];
            $session_summary_data = [];

            $parent = User::with([
                    'branch',
                    'organization',
                    'child' => function($query) {
                        $query->where('primary_payer', '=', true);
                    },
                    'child.ccs_enrolment'
                ])->findOrFail($parent_id);

            $ccs_enabled = false;
            $service = null;
            $provider = null;
            $service_id = null;

            $organization = $parent->organization;
            $branch = $parent->branch;

            try {
                
                $ccsOrg = $this->ccsSetupRepo->findByUser($parent->id, []);
                $provider = $this->providerRepo->findByUser($parent->id, []);
                $service = $this->serviceRepo->findByUser($parent->id, []);
                
                if ($ccsOrg && $ccsOrg->deleted_at === null) {
                    $ccs_enabled = true;
                }

                $service_id = $service->service_id;
                $person_id = $ccsOrg->person_id;

            } catch (Exception $error) {
                $ccs_enabled = false;
            }

            $bpay = ParentPaymentMethod::where('user_id', '=', $parent->id)
                ->where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[3])
                ->where('status', '=', '0')
                ->get()
                ->first();

            $queryLimitDate = $start_date_obj->copy()->addDays(83);
            $queryEndDate = null;
            $limitedSubsidy = false;

            if ($end_date_obj->greaterThan($queryLimitDate)) {
                $limitedSubsidy = true;
                $queryEndDate = $queryLimitDate->copy();
            } else {
                $limitedSubsidy = false;
                $queryEndDate = $end_date_obj->copy();
            }

            if (count($parent->child) > 0 && $service_id && $person_id && $ccs_enabled) {

                foreach ($parent->child as $child_data) {

                    $enrolment_record = $child_data->ccs_enrolment->first();

                    if (!$enrolment_record) {
                        continue;
                    }

                    $enrolment_db_id = Helpers::decodeHashedID($enrolment_record->index);
                    $enrolment_id = $enrolment_record->enrolment_id;
                    $child_full_name = $child_data->full_name;

                    $client = new Client();

                    $url = Helpers::getConfig('session_subsidy', AWSConfigType::API_GATEWAY);

                    $api_result = $client->request('GET', $url, [
                        'headers' => [
                            'x-api-key' => config('aws.gateway_api_key'),
                            'authpersonid' => $person_id
                        ],
                        'query' => [
                            '$ccsserviceid' => $service_id,
                            '$ccsenrolmentid' => $enrolment_id,
                            '$ccsreportstartdate' => $start_date,
                            '$ccsreportenddate' => $queryEndDate->format('Y-m-d'),
                            '$expand' => 'SessionOfCares,SessionOfCares/Entitlements'
                        ]
                    ]);

                    if ($api_result->getStatusCode() == 200) {

                        $api_data_body = $api_result->getBody()->getContents();
                        $api_response = json_decode($api_data_body, true);


                        if (array_key_exists('results', $api_response) && count($api_response['results']) > 0) {

                            $grouped_week_data = Helpers::array_group_by($api_response['results'], 'sessionReportStartDate');

                            foreach ($grouped_week_data as $week_key => $week_group) {

                                $dailyRecArr = [];
                                $ccs_total = 0;
                                $accs_total = 0;
                                $center_hours_total = 0;
                                $ccs_hours_total = 0;
                                $fee_total = 0;
                                $gap = 0;

                                $update_time_arr = array_map(function ($val) {
                                    return Carbon::parse($val['initialSubmittedDateTime'])->unix();
                                }, $week_group);

                                if (array_search($enrolment_id, array_column($absence_data, 'enrolment_id')) === false) {
                                    array_push($absence_data, [
                                        'full_name' => $child_full_name,
                                        'enrolment_id' => $enrolment_id,
                                        'absent_days' => $week_group[array_search(max($update_time_arr), $update_time_arr)]['totalAbsenceDays']
                                    ]);
                                }

                                foreach ($week_group as $week_data) {

                                    if (array_key_exists('sessionReportProcessingStatus', $week_data) && $week_data['sessionReportProcessingStatus'] !== 'PROCES') {
                                        continue;
                                    }

                                    if (array_key_exists('SessionOfCares', $week_data) && array_key_exists('results',$week_data['SessionOfCares'])) {

                                        foreach ($week_data['SessionOfCares']['results'] as $day_record) {

                                            // $existing_day_index = array_search($day_record['date'], array_column($dailyRecArr, 'date'));
                                            $existing_day_index = false;

                                            foreach ($dailyRecArr as $key => $val) {
                                                if ($val['date'] === $day_record['date'] && $val['startTime'] === $day_record['startTime'] && $val['endTime'] === $day_record['endTime']) {
                                                    $existing_day_index = $key;
                                                    break;
                                                }
                                            }

                                            if ($existing_day_index !== false) {
                                                array_splice($dailyRecArr, $existing_day_index, 1);
                                            }

                                            $cloned_day_data = $day_record;
                                            $cloned_day_data['full_name'] = $child_full_name;
                                            array_push($dailyRecArr, $cloned_day_data);

                                        }

                                    }

                                }

                                $accs_service_total = null;

                                foreach ($dailyRecArr as $day_rec) {

                                    if (array_key_exists('Entitlements', $day_rec) && array_key_exists('results', $day_rec['Entitlements'])) {

                                        foreach ($day_rec['Entitlements']['results'] as $entitlement) {

                                            if ($entitlement['recipient'] === 'INDIVI') {
                                                $accs_service_total = $week_group[0]['weeklyEntitlementAmount'];
                                            }

                                            if ($entitlement['type'] == PaymentHelpers::ENTITLEMENT_CCS_TYPE) {
                                                $ccs_total += floatval($entitlement['amount']);
                                            } else if($entitlement['type'] == PaymentHelpers::ENTITLEMENT_ACCS_TYPE) {
                                                $accs_total += floatval($entitlement['amount']);
                                            }

                                            $ccs_hours_total += floatval($entitlement['subsidisedHours']);

                                        }

                                    }

                                }

                                $center_hours_total = array_sum(array_map(function ($val) { return floatval($val); },array_column($dailyRecArr, 'totalHoursInSession')));
                                $fee_total = array_sum(array_map(function ($val) { return floatval($val); },array_column($dailyRecArr, 'sessionAmountCharged')));
                                $gap = $fee_total - ($accs_total + $ccs_total);

                                $week_obj = [
                                    'full_name' => $child_full_name,
                                    'week' => $week_key,
                                    'hours_total' => bcdiv($center_hours_total, 1, 2), // bcdiv to preserve 2 decimal place without rounding off
                                    'ccs_hours_total' => bcdiv($ccs_hours_total, 1, 2),
                                    'fee_total' => bcdiv($fee_total, 1, 2),
                                    'ccs_total' => bcdiv($ccs_total, 1, 2),
                                    'accs_total' => bcdiv($accs_total, 1, 2),
                                    'accs_service_total' => $accs_service_total,
                                    'gap' => bcdiv($gap, 1, 2)
                                ];

                                array_push($entitlement_data, $week_obj);

                                $update_time_arr = [];
                                unset($week_obj);

                            }

                        } else {

                            Log::info('No items in result array');

                        }

                    } else {

                       Log::info('API request failed');

                    }

                    $db_session_data = SessionSubmission::whereIn('id', function ($query) use($enrolment_db_id, $end_date, $start_date) {
                            $query->selectRaw('max(id)')
                                ->from('km8_session_submission')
                                ->where('enrolment_id', $enrolment_db_id)
                                ->where('session_start_date', '<=', $end_date)
                                ->where('session_end_date', '>=', $start_date)
                                ->where(function($qu) {
                                    $qu->where('status', 'PROCES')->orWhere('status', 'RECEIV');
                                })
                                ->groupBy('session_report_date');
                        })
                        ->orderBy('id')
                        ->get();

                    if (count($db_session_data) > 0) {

                        foreach ($db_session_data as $db_session) {

                            if ($db_session['sessions']) {

                                foreach ($db_session['sessions'] as $day_session) {

                                    if ($day_session['isChildAbsent'] === true && !Carbon::createFromFormat('Y-m-d', $day_session['date'])->between($start_date_obj, $end_date_obj, true)) {
                                        continue;
                                    }

                                    $existing_index = false;

                                    foreach ($session_summary_data as $session_key => $session_val) {
                                        if ($session_val['enrolment_id'] === $enrolment_id && $session_val['date'] === $day_session['date'] && $session_val['session_start'] === $day_session['startTime'] && $session_val['session_end'] === $day_session['endTime']) {
                                            $existing_index = $session_key;
                                            break;
                                        }
                                    }

                                    if ($existing_index !== false) {
                                        array_splice($session_summary_data, $existing_index, 1);
                                    }

                                    $day_hours = Carbon::createFromFormat('H:i:s', $day_session['endTime'])->floatDiffInHours(Carbon::createFromFormat('H:i:s', $day_session['startTime']));

                                    if (array_key_exists('Attendances', $day_session) && $day_session['isChildAbsent'] !== true) {

                                        foreach ($day_session['Attendances'] as $attendance) {

                                            $day_obj = [
                                                'date' => $day_session['date'],
                                                'full_name' => $child_full_name,
                                                'session_start' => $day_session['startTime'],
                                                'session_end' => $day_session['endTime'],
                                                'sign_in' => $attendance['timeIn'],
                                                'sign_out' => $attendance['timeOut'],
                                                'hours' => number_format($day_hours, 2),
                                                'fee' => $day_session['amountCharged'],
                                                'hourly_fee' => number_format(floatval($day_session['amountCharged'])/$day_hours, 2),
                                                'enrolment_id' => $enrolment_id
                                            ];

                                            array_push($session_summary_data, $day_obj);

                                            unset($day_obj);

                                        }

                                    } else {

                                        $day_obj = [
                                            'date' => $day_session['date'],
                                            'full_name' => $child_full_name,
                                            'session_start' => $day_session['startTime'],
                                            'session_end' => $day_session['endTime'],
                                            'sign_in' => 'Absent',
                                            'sign_out' => 'Absent',
                                            'hours' => number_format($day_hours, 2),
                                            'fee' => $day_session['amountCharged'],
                                            'hourly_fee' => number_format(floatval($day_session['amountCharged'])/$day_hours, 2),
                                            'enrolment_id' => $enrolment_id
                                        ];

                                        array_push($session_summary_data, $day_obj);

                                        unset($day_obj);

                                    }

                                }

                            }

                        }

                    }

                    usort($entitlement_data, function($a, $b) {
                        return (Carbon::createFromFormat('Y-m-d', $b['week'])->unix() > Carbon::createFromFormat('Y-m-d', $a['week'])->unix()) ? -1 : 1;
                    });

                    usort($session_summary_data, function($a, $b) {
                        return (Carbon::createFromFormat('Y-m-d', $b['date'])->unix() > Carbon::createFromFormat('Y-m-d', $a['date'])->unix()) ? -1 : 1;
                    });

                }

            } else {
                Log::info('No child for parent or ccs not enabled');
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'transactions' => new ParentPaymentTransactionResourceCollection($filteredTransactions, ['financeStatementData' => true]),
                        'opening_balance' => $opening_balance,
                        'credit_total' => $credit_total,
                        'debit_total' => $debit_total,
                        'entitlements' => $entitlement_data,
                        'session_summary' => $session_summary_data,
                        'absences' => $absence_data,
                        'ccs_enabled' => $ccs_enabled,
                        'payment_date' => $payment_date,
                        'organization' => new OrganizationResource($organization),
                        'branch' => new BranchResource($branch, ['basic' => true]),
                        'provider' => $provider ? new ProviderSetupResource($provider) : null,
                        'service' => $service ? new ServiceSetupResource($service) : null,
                        'parent' => new UserResource($parent),
                        'bpay' => $bpay ? new ParentPaymentMethodResource($bpay) : null,
                        'limited_subsidy' => $limitedSubsidy
                    ]
                ),
                RequestType::CODE_200
            );


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

    public function parentStatementPdfPreview(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'start_date' => ['required'],
                'end_date' => ['required']
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

            $parent_id = Helpers::decodeHashedID($request->input('id'));

            $transaction_data = ParentPaymentTransaction::where('parent_id', $parent_id)
                ->where('date', '>=', $request->input('start_date'))
                ->where('date', '<=', $request->input('end_date'))
                ->count();

            if($transaction_data == 0) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('payment.parent_statement_not_found')
                    ),
                    RequestType::CODE_400
                );

            }

            $lambda = new LambdaClient([
                'region' => 'ap-southeast-2',
                'version' => '2015-03-31',
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            if(auth()->user()->branch_id === config('lambda.forbes_id')) // -----------Change this for forbes-----------
            {
                $functionName = 'nextgen-CCS-generateParentStatement-forbes';
            }
            else
            {
                $functionName = 'nextgen-CCS-generateParentStatement';
            }

            $invoke_obj = [
                'FunctionName' => $functionName, // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'parent_id' => [$parent_id],
                    'mode' => 'preview',
                    'start_date' => $request->input('start_date'),
                    'end_date' => $request->input('end_date'),
                    'payment_date' => $request->input('payment_date') ? $request->input('payment_date') : null
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            Log::info('Invoke Object');
            Log::info($invoke_obj);

            $result = $lambda->invoke($invoke_obj);

            $res_payload = json_decode($result->get('Payload'), true);

            $file_url = null;

            if(array_key_exists('success', $res_payload) && $res_payload['success'] == true) {

                $file_url = $res_payload['url'];

            } else {

                if (array_key_exists('success', $res_payload) && $res_payload['success'] == false && array_key_exists('message', $res_payload)) {
                    throw new Exception($res_payload['message'], 1000);
                } else {
                    throw new Exception('Error in Lambda', 1000);
                }

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $file_url
                ),
                RequestType::CODE_200
            );


        } catch (\Exception $e) {

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

    public function statementSend(Request $request)
    {

        try {


            $validator = Validator::make($request->all(), [
                'start_date' => ['required'],
                'end_date' => ['required']
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


            $parent_id = Helpers::decodeHashedID($request->input('id'));

            $transaction_data = ParentPaymentTransaction::whereIn('parent_id', $parent_id)
                ->where('date', '>=', $request->input('start_date'))
                ->where('date', '<=', $request->input('end_date'))
                ->count();

            if ($transaction_data == 0) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('payment.parent_statement_not_found')
                    ),
                    RequestType::CODE_400
                );
            }

            $lambda = new LambdaClient([
                'region' => 'ap-southeast-2',
                'version' => '2015-03-31',
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            if (auth()->user()->branch_id === config('lambda.forbes_id')) // -----------Change this for forbes-----------
            {
                $functionName = 'nextgen-CCS-generateParentStatement-forbes';
            } else {
                $functionName = 'nextgen-CCS-generateParentStatement';
            }

            $invoke_obj = [
                'FunctionName' => $functionName, // REQUIRED
                'InvocationType' => 'Event',
                'Payload' => json_encode([
                    'parent_id' => is_array($parent_id) ? $parent_id : [$parent_id],
                    'mode' => 'email',
                    'start_date' => $request->input('start_date'),
                    'end_date' => $request->input('end_date'),
                    'payment_date' => $request->input('payment_date') ? $request->input('payment_date') : null
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            Log::info('Send mail invoke object');
            Log::info($invoke_obj);

            $result = $lambda->invoke($invoke_obj);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_statement_emailed')
                ),
                RequestType::CODE_200
            );

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

}
