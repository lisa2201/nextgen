<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Lambda\LambdaClient;
use Carbon\CarbonPeriod;
use CCSHelpers;
use DBHelper;
use ErrorHandler;
use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Http\Request;
use Kinderm8\CCSEnrolment;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use RequestHelper;
use Helpers;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Kinderm8\Http\Resources\UserResourceCollection;
use Illuminate\Support\Facades\Validator;
use Kinderm8\AdjustmentItem;
use Kinderm8\Branch;
use Kinderm8\Child;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Organization;
use Kinderm8\ParentPayment;
use Kinderm8\ParentPaymentAdjustment;
use Kinderm8\ParentPaymentAdjustmentsHeader;
use Kinderm8\ParentPaymentProvider;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\ParentPaymentSchedule\IParentPaymentScheduleRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use LocalizationHelper;
use PaymentHelpers;

class FinanceController extends Controller
{

    private $ccsSetupRepo;
    private $childRepo;
    private $userRepo;
    private $paymentPlanRepo;

    public function __construct(ICCSSetupRepository $ccsSetupRepo, IChildRepository $childRepo, IUserRepository $userRepo, IParentPaymentScheduleRepository $paymentPlanRepo)
    {
        $this->ccsSetupRepo = $ccsSetupRepo;
        $this->childRepo = $childRepo;
        $this->userRepo = $userRepo;
        $this->paymentPlanRepo = $paymentPlanRepo;
    }

    use UserAccessibility;

    private $sortColumnsMap = [
        'name' => 'first_name',
        'account_balance' => 'running_total'
    ];

    public function listAccounts(Request $request)
    {

        $actualCount = 0;
        $filters = null;

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->get('search'))) ? Helpers::sanitizeInputString($request->get('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->get('sort')) && is_null($searchValue)) ? json_decode($request->get('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $accounts = User::whereHas('roles', function($query)
                {
                    $query->where('type', RoleType::PARENTSPORTAL);
                });

            $accounts = $this->attachAccessibilityQuery($accounts, null, 'km8_users');

            $accounts = $accounts
                ->leftJoin('km8_parent_payment_transactions AS ppt1', 'ppt1.parent_id', 'km8_users.id')
                ->leftJoin('km8_parent_payment_transactions AS ppt2', function ($join) {
                    $join->on('km8_users.id', '=', 'ppt2.parent_id')
                         ->whereRaw('ppt1.id < ppt2.id');
                })
                ->where('ppt2.id', '=', null)
                ->select('km8_users.*', DB::raw('COALESCE(ppt1.running_total, 0) AS running_total'));

            //get actual count
            $actualCount = $accounts->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->payment_schedule) && $filters->payment_schedule !== 'all') {

                    $accounts->when($filters->payment_schedule == 'no', function ($query) {
                        return $query->whereDoesntHave('paymentSchedules', function($subquery) {
                            $subquery->where('status', '=', 'active')->orWhere('status', '=', 'upcoming');
                        });
                    });

                    $accounts->when($filters->payment_schedule == 'active' || $filters->payment_schedule == 'upcoming', function ($query) use($filters) {

                        return $query->whereHas('paymentSchedules', function($subquery) use($filters) {

                            $subquery
                                ->when($filters->payment_schedule == 'active', function($innerquery) {
                                    return $innerquery->where('status', '=', 'active');
                                })
                                ->when($filters->payment_schedule == 'upcoming', function($innerquery) {
                                    return $innerquery->where('status', '=', 'upcoming');
                                })
                                ->when(isset($filters->payment_frequency) && $filters->payment_frequency, function($innerquery) use($filters) {
                                    return $innerquery->where('payment_frequency', '=', $filters->payment_frequency);
                                })
                                ->when(isset($filters->billing_term) && $filters->billing_term, function($innerquery) use($filters) {
                                    return $innerquery->where('billing_term', '=', $filters->billing_term);
                                })
                                ->when(isset($filters->payment_day) && $filters->payment_day, function($innerquery) use($filters) {
                                    return $innerquery->where('payment_day', '=', $filters->payment_day);
                                })
                                ->when(isset($filters->auto_charge), function($innerquery) use($filters) {
                                    return $innerquery->where('auto_charge', '=', $filters->auto_charge ? true : false);
                                });

                        });

                    });

                }

                if (isset($filters->payment_method) && $filters->payment_method !== 'all') {

                    $accounts
                        ->when($filters->payment_method == 'none', function ($query) {
                            return $query->whereDoesntHave('parentPaymentMethods', function($subquery) {
                                $subquery->where('status', '=', '0');
                            });
                        })
                        ->when($filters->payment_method == 'ezidebit', function ($query) {
                            return $query->whereHas('parentPaymentMethods', function($subquery) {
                                $subquery->where('payment_type', '=', 'ezidebit')->where('status', '=', '0');
                            });
                        })
                        ->when($filters->payment_method == 'bpay', function ($query) {
                            return $query->whereHas('parentPaymentMethods', function($subquery) {
                                $subquery->where('payment_type', '=', 'bpay')->where('status', '=', '0');
                            });
                        });

                }

                if (isset($filters->account_balance_equality) && $filters->account_balance_equality && isset($filters->account_balance_value)) {

                    $balance_value = (double)$filters->account_balance_value;

                    $accounts
                        ->when($filters->account_balance_equality == 'lt', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '<', $balance_value);

                        })
                        ->when($filters->account_balance_equality == 'gt', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '>', $balance_value);

                        })
                        ->when($filters->account_balance_equality == 'eq', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '=', $balance_value);

                        });

                }

                if (isset($filters->last_payment_date_equality) && $filters->last_payment_date_equality && isset($filters->last_payment_date) && $filters->last_payment_date) {

                    $last_date = $filters->last_payment_date;

                    $accounts
                        ->when($filters->last_payment_date_equality == 'lt', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '<', $last_date);
                            });

                        })
                        ->when($filters->last_payment_date_equality == 'gt', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '>', $last_date);
                            });

                        })
                        ->when($filters->last_payment_date_equality == 'eq', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '=', $last_date);
                            });

                        });

                }

                if (isset($filters->next_payment_date_equality) && $filters->next_payment_date_equality && isset($filters->next_payment_date) && $filters->next_payment_date) {

                    $next_payment_date = $filters->next_payment_date;

                    $accounts
                        ->when($filters->next_payment_date_equality == 'lt', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '<', $next_payment_date);
                            });

                        })
                        ->when($filters->next_payment_date_equality == 'gt', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '>', $next_payment_date);
                            });
                            
                        })
                        ->when($filters->next_payment_date_equality == 'eq', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '=', $next_payment_date);
                            });

                        });

                }

                $accounts
                    ->when(isset($filters->primary_payer) && $filters->primary_payer !== 'all', function ($query) use($filters) {
                        
                        return $query->whereHas('child', function($subquery) use($filters) {
                            $subquery->where('primary_payer', '=', $filters->primary_payer == 'yes' ? true : false);
                        });

                    })
                    ->when(isset($filters->parent_status) && $filters->parent_status !== 'all', function ($query) use($filters) {
                        
                        return $query->where('status', '=', $filters->parent_status);
                    });

            }

            //search
            if (!is_null($searchValue)) {

                $accounts->where(function ($query) use ($searchValue) {
                    $query->where('first_name', 'ILIKE', '%' . $searchValue . '%')
                        ->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%')
                        ->orWhereHas('child', function ($chquery) use ($searchValue) {
                            $chquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%');
                        });
                });
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $accounts->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $accounts->orderBy('first_name', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[0]);
            }

            $hasEzidebit = ParentPaymentProvider::where('status', '=', '0')->where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[1])->first() ? true : false;

            $accounts = $accounts
                ->paginate($offset);

            $accounts->load([
                'child' => function ($query) {
                    $query->where('status', '=', '1');
                },
                'paymentSchedules',
                'parentPaymentMethods',
                'bond'
            ]);

            return (new UserResourceCollection($accounts, ['financeAccounts' => true]))
                ->additional([
                    'totalRecords' => $actualCount,
                    'filtered' => !is_null($filters),
                    'hasEzidebit' => $hasEzidebit
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

    public function getParentList(Request $request)
    {

        try {

            $users = User::whereHas('child', function($query) {
                    $query->where('status', '=', '1');
                })
                ->where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->whereHas('child')
                ->Active()
                ->whereHas('roles', function($query)
                {
                    $query->where('type', RoleType::PARENTSPORTAL);
                })
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get();

            return (new UserResourceCollection($users, ['basic' => true]))
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

    public function getBranchList(Request $request)
    {

        try {

            $branches = Branch::where('organization_id', '=', auth()->user()->organization_id)->get();

            return (new BranchResourceCollection($branches, ['short' => true]))
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

    public function getAccountBalance(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'user_id' => ['required']
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

            $amount = PaymentHelpers::getRunningTotal(Helpers::decodeHashedID($request->input('user_id')), true, null, null);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $amount
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

    //------------------------------------------------------------------//
    // Dashboard
    //------------------------------------------------------------------//

    public function getPaymentDashboardSummary(Request $request)
    {

        try {

            $id = (! Helpers::IsNullOrEmpty($request->input('branch_id'))) ? Helpers::decodeHashedID($request->input('branch_id')) : null;
            $date = (! Helpers::IsNullOrEmpty($request->input('current'))) ? $request->input('current') : null;
            $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
            $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

            $payments = ParentPayment::where('organization_id', auth()->user()->organization_id)
                ->whereBetween('date', [$start, $end])
                ->where('status', '!=', 'refund_success');

            if (!is_null($id)) {
                $payments->where('branch_id', $id);
            }

            $payments = $payments->get();

            $today = $payments->map(function ($item) use ($date)
            {
                return $item->date === $date ? (float) $item->amount : 0;
            });

            $week = $payments->map(function ($item)
            {
                return (float) $item->amount;
            });

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'today' => $today->sum(),
                        'week' => $week->sum()
                    ]
            ), RequestType::CODE_200);

        } catch (Exception $e) {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('response.error_process')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function getOverdueDashboardSummary(Request $request)
    {

        try {
            $id = (! Helpers::IsNullOrEmpty($request->input('branch_id'))) ? Helpers::decodeHashedID($request->input('branch_id')) : null;
            $date = Carbon::now();
            $start = $date->clone();
            $end = null;
            $filter = (! Helpers::IsNullOrEmpty($request->input('filter'))) ? $request->input('filter') : null;

            $payments = ParentPayment::where('organization_id', auth()->user()->organization_id)->whereNotIn('status', array('rejected_user', 'completed'));

            if (!is_null($id)) {
                $payments->where('branch_id', $id);
            }

            if (!is_null($filter)) {

                if ($filter === 'month') {
                    $end = $start->clone()->subtract('days', 30);
                }

                if ($filter === 'week') {
                    $end = $start->clone()->subtract('days', 7);
                }

                if ($filter === 'fortnight') {
                    $end = $start->clone()->subtract('days', 14);
                }

            }

            $payments->where('date', '<=' , $end);

            $payments = $payments->get();

            $overdue = count($payments);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'over_due' => $overdue,
                        'aged_debtors' => 0
                    ]
            ), RequestType::CODE_200);

        } catch (Exception $e) {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('response.error_process')
                ),
                RequestType::CODE_500
            );
        }
    }

    //------------------------------------------------------------------//
    // Bulk Operation
    //------------------------------------------------------------------//

    public function listCCSPayments(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            // Pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;
            $page = (!Helpers::IsNullOrEmpty($request->get('page'))) ?  (int) $request->get('page') : 1;

            $return_array = CCSHelpers::getCcsPayments($filters, true, true, $offset, $page, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $return_array
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

    public function getSessionSubsidyDependency(Request $request) {

        try {

            $childrenList = Child::
                whereHas('ccs_enrolment', $enrolmentFilter = function ($query) {
                    $query->where('status', 'CONFIR');
                })
                ->with(['ccs_enrolment' => $enrolmentFilter])
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResourceCollection($childrenList)
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

    public function getViewEntitlementDependency(Request $request)
    {

        try {

            $data = $this->childRepo->get(
                [],
                ['ccs_enrolment'],
                $request,
                false
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResourceCollection($data)
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

    public function listSessionSubsidies(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $return_array = CCSHelpers::getSessionSubsidy($filters, true, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $return_array
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

    public static function ccsPaymentsCsv(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $return_array = CCSHelpers::getCcsPayments($filters, true, false, null, null, true);

            if (!$return_array || count($return_array) === 0) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'No records found'
                    ),
                    RequestType::CODE_400
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $return_array
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

    public static function sessionSubsidyCsv(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $return_array = CCSHelpers::getSessionSubsidy($filters, false, true);

            if (!$return_array || count($return_array) === 0) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'No records found'
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

            $invoke_obj = [
                'FunctionName' => 'nextgen-CCS-bulkOperationCsv', // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'data' => $return_array,
                    'type' => 'session_subsidy'
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

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

    public function viewSessionReports(Request $request){

        $offset = $request->input('offset');
        $page = $request->input('page');
        $branch = Helpers::decodeHashedID($request->input('branch'));
        $branch = Branch::where('id',$branch)->get()->first();
        $service = $branch->providerService;
        $serviceID = $service->service_id;

        $filters = $request->input('filters');
        $filters = json_decode($filters, true);

        $startDate = $filters['startDate'];
        $updatedSince = $filters['updatedSince'];
        $includeHistory = $filters['includeHistory'];

        \Log::info("===========================================View Session Reports=====================================");
        if($filters['child'] != 'ServiceID')
        {

            $child = Helpers::decodeHashedID($filters['child']);
            $child = Child::find($child);
            if($child->active_ccs_enrolment->first())
            {
                \Log::info("By child. Enrolment ID -> ".$child->active_ccs_enrolment->first()->enrolment_id);
                if($includeHistory && $includeHistory==true)
                    $ccshistory = true;
                else
                    $ccshistory = 0;
                $ccsstartdate = $startDate;
                $ccsupdatesince = $updatedSince;
                if($ccsstartdate && $ccsupdatesince)
                    $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsenrolmentid='.$child->active_ccs_enrolment->first()->enrolment_id.'&$ccsstartdate='.$ccsstartdate.'&$ccsupdatesince='.$ccsupdatesince.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
                elseif($ccsstartdate && !$ccsupdatesince)
                    $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsenrolmentid='.$child->active_ccs_enrolment->first()->enrolment_id.'&$ccsstartdate='.$ccsstartdate.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
                elseif(!$ccsstartdate && $ccsupdatesince)
                    $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsenrolmentid='.$child->active_ccs_enrolment->first()->enrolment_id.'&$ccsupdatesince='.$ccsupdatesince.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
                else
                    $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsenrolmentid='.$child->active_ccs_enrolment->first()->enrolment_id.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
            }
            else
            {
                return [ 'ApiData' => ['ReturnMessage' => 'Selected Child does not have an Enrolment ID', 'ReturnError' => 'API Error']];
            }


        }
        else
        {
            \Log::info("All Children. Service ID -> ".$serviceID);
            if($includeHistory && $includeHistory==true)
                $ccshistory = true;
            else
                $ccshistory = 0;
            $ccsstartdate = $startDate;
            $ccsupdatesince = $updatedSince;
            if($ccsstartdate && $ccsupdatesince)
                $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsstartdate='.$ccsstartdate.'&$ccsupdatesince='.$ccsupdatesince.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
            elseif($ccsstartdate && !$ccsupdatesince)
                $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsstartdate='.$ccsstartdate.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
            elseif(!$ccsstartdate && $ccsupdatesince)
                $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccsupdatesince='.$ccsupdatesince.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
            else
                $url = Helpers::getConfig('session_reports', AWSConfigType::API_GATEWAY).'?$ccsserviceid='.$serviceID.'&$ccshistory='.$ccshistory.'&$expand=Statuses,SessionOfCares/Attendances';
        }

        \Log::info($url);


        $client = new Client();
        try {

            $ccsOrg = $this->ccsSetupRepo->findByBranch(Helpers::decodeHashedID($request->input('branch')), []);

            $res = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                    'authpersonid' => $ccsOrg->person_id,
                ]
            ]);
        } catch (Exception $e) {
            \Log::error($e);
            if($e->getResponse())
            {
                $errorResponse = (string) $e->getResponse()->getBody();
                if($errorResponse)
                {
                    $errorResponseJSON = json_decode($errorResponse, true);
                    if($errorResponseJSON['Category'] && $errorResponseJSON['FaultText'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['FaultText'], 'ReturnError' => 'API Error']];
                    if($errorResponseJSON['Category'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['Category'], 'ReturnError' => 'API Error']];
                }
            }
            return ['ApiData' => ['ReturnMessage' => 'Error Connecting to API', 'ReturnError' => 'API Error']];
        } catch (GuzzleException $e) {
            \Log::error($e);
            if($e->getResponse())
            {
                $errorResponse = (string) $e->getResponse()->getBody();
                if($errorResponse)
                {
                    $errorResponseJSON = json_decode($errorResponse, true);
                    if($errorResponseJSON['Category'] && $errorResponseJSON['FaultText'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['FaultText'], 'ReturnError' => 'API Error']];
                    if($errorResponseJSON['Category'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['Category'], 'ReturnError' => 'API Error']];
                }
            }
            return ['ApiData' => ['ReturnMessage' => 'Error Connecting to API', 'ReturnError' => 'API Error']];
        }
        $body = $res->getBody()->getContents();

        $resp_data_session_reports = json_decode($body, true);


        foreach($resp_data_session_reports['results'] as $key=>$result)
        {
            //$resp_data_session_reports['results'][$key]
            if($result['enrolmentID'])
            {
                $enrolment = CCSEnrolment::where('enrolment_id',$result['enrolmentID'])->get()->first();
                if($enrolment)
                {
                    $child = Child::find($enrolment->child_id);
                    if($child)
                    {
                        $resp_data_session_reports['results'][$key]['childName'] = $child->first_name." ".$child->last_name;
                    }
                }
            }


        }

        \Log::info("===========================================END View Session Reports=====================================");
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                [
                    'ApiData' => $resp_data_session_reports
                ]
            ),
            RequestType::CODE_200
        );

    }



    public function viewEntitlement(Request $request)
    {

        try {
            
            $branch_id = auth()->user()->branch_id ?? null;

            if (is_null($branch_id)) {
                throw new Exception('Branch ID not provided', ErrorType::CustomValidationErrorCode);
            }

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $data = CCSHelpers::getEntitlementApiData($filters, true, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );


        } catch (Exception $e) {

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }

    }

    /**
     * Get Organization Info
     */
    public function getOrgInfo(Request $request)
    {
        try {

            if(auth()->user()->isAdministrative() || auth()->user()->hasOwnerAccess()) {
                $id = auth()->user()->organization_id;
            } else {
                $id = Helpers::decodeHashedID($request->input('id'));
            }
            $id =

            $rowObj = Organization::find($id);

            if (is_null($rowObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return (new OrganizationResource($rowObj, ['getSubInfo' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {

            ErrorHandler::log($e);

            return $e->getMessage();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }

    public function getSelectparentList(Request $request)
    {

        try {

            $users = User::with(['child'])
                ->where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->whereHas('roles', function($query)
                {
                    $query->where('type', RoleType::PARENTSPORTAL);
                })
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get();

            return (new UserResourceCollection($users, ['basic' => true]))
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

    public function invokeBookingTransactions(Request $request)
    {

        try {

            $branch_id = auth()->user()->branch_id;

            $lambda = new LambdaClient([
                'region' => 'ap-southeast-2',
                'version' => '2015-03-31',
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $invoke_obj = [
                'FunctionName' => config('aws.lambda.nextgen_booking_transactions'), // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'date' => null,
                    'parent_id' => null,
                    'branch_id' => [$branch_id]
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            $term_invoke_obj = [
                'FunctionName' => config('aws.lambda.nextgen_term_transactions'), // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'date' => null,
                    'parent_id' => null,
                    'branch_id' => [$branch_id]
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            $past_booking_invoke_obj = [
                'FunctionName' => config('aws.lambda.past_booking_manager'), // REQUIRED
                'InvocationType' => 'RequestResponse',
                'Payload' => json_encode([
                    'date' => null,
                    'parent_id' => null,
                    'branch_id' => [$branch_id]
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            $result = $lambda->invoke($invoke_obj);
            $result2 = $lambda->invoke($term_invoke_obj);
            $result3 = $lambda->invoke($past_booking_invoke_obj);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.booking_transaction_invoke')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function getChildrenWithoutPayer(Request $request)
    {

        try {

            $withPayerQuery = Child::join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');
            $withPayerQuery = $this->attachAccessibilityQuery($withPayerQuery, null, 'km8_child_profile');
            $childrenWithPayer = $withPayerQuery->whereHas('parents', function($query) {
                $query->where('primary_payer', '=', true);
            })
            ->select(['km8_child_profile.*', 'km8_organization_branch.name'])
            ->groupBy('km8_child_profile.id', 'km8_organization_branch.name')
            ->get();

            $withoutPayerQuery = Child::join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');
            $withoutPayerQuery = $this->attachAccessibilityQuery($withoutPayerQuery, null, 'km8_child_profile');

            $childrenWithoutPayer = $withoutPayerQuery->where(function($subquery) use ($childrenWithPayer) {
                    $subquery
                        ->whereDoesntHave('parents')
                        ->OrWhereHas('parents', function($query) use($childrenWithPayer) {
                            $query->where('primary_payer', '=', false)->whereNotIn('child_id', $childrenWithPayer->pluck('id'));
                        });
                })
                ->where('km8_child_profile.status', '=', '1')
                ->orderBy('km8_child_profile.first_name')
                ->select(['km8_child_profile.*', 'km8_organization_branch.name'])
                ->groupBy('km8_child_profile.id', 'km8_organization_branch.name')
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.booking_transaction_invoke'),
                    new ChildResourceCollection($childrenWithoutPayer, ['short' => true])
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    //------------------------------------------------------------------//
    // Waive Fee
    //------------------------------------------------------------------//

    public function waiveFeeUsers(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $users = $this->userRepo->whereHas('roles', function($query)
                {
                    $query->where('type', RoleType::PARENTSPORTAL);
                });

            $users = $this->attachAccessibilityQuery($users);

            //filters
            if (!is_null($filters)) {

                if (isset($filters->payment_schedule) && $filters->payment_schedule !== 'all') {

                    $users->when($filters->payment_schedule == 'no', function ($query) {
                        return $query->whereDoesntHave('paymentSchedules', function($subquery) {
                            $subquery->where('status', '=', 'active')->orWhere('status', '=', 'upcoming');
                        });
                    });

                    $users->when($filters->payment_schedule == 'active' || $filters->payment_schedule == 'upcoming', function ($query) use($filters) {

                        return $query->whereHas('paymentSchedules', function($subquery) use($filters) {

                            $subquery
                                ->when($filters->payment_schedule == 'active', function($innerquery) {
                                    return $innerquery->where('status', '=', 'active');
                                })
                                ->when($filters->payment_schedule == 'upcoming', function($innerquery) {
                                    return $innerquery->where('status', '=', 'upcoming');
                                })
                                ->when(isset($filters->payment_frequency) && $filters->payment_frequency, function($innerquery) use($filters) {
                                    return $innerquery->where('payment_frequency', '=', $filters->payment_frequency);
                                })
                                ->when(isset($filters->billing_term) && $filters->billing_term, function($innerquery) use($filters) {
                                    return $innerquery->where('billing_term', '=', $filters->billing_term);
                                })
                                ->when(isset($filters->payment_day) && $filters->payment_day, function($innerquery) use($filters) {
                                    return $innerquery->where('payment_day', '=', $filters->payment_day);
                                })
                                ->when(isset($filters->auto_charge), function($innerquery) use($filters) {
                                    return $innerquery->where('auto_charge', '=', $filters->auto_charge ? true : false);
                                });

                        });

                    });

                }

                if (isset($filters->payment_method) && $filters->payment_method !== 'all') {

                    $users
                        ->when($filters->payment_method == 'none', function ($query) {
                            return $query->whereDoesntHave('parentPaymentMethods', function($subquery) {
                                $subquery->where('status', '=', '0');
                            });
                        })
                        ->when($filters->payment_method == 'ezidebit', function ($query) {
                            return $query->whereHas('parentPaymentMethods', function($subquery) {
                                $subquery->where('payment_type', '=', 'ezidebit')->where('status', '=', '0');
                            });
                        })
                        ->when($filters->payment_method == 'bpay', function ($query) {
                            return $query->whereHas('parentPaymentMethods', function($subquery) {
                                $subquery->where('payment_type', '=', 'bpay')->where('status', '=', '0');
                            });
                        });

                }

                if (isset($filters->account_balance_equality) && $filters->account_balance_equality && isset($filters->account_balance_value)) {

                    $balance_value = (double)$filters->account_balance_value;

                    $users
                        ->when($filters->account_balance_equality == 'lt', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '<', $balance_value);

                        })
                        ->when($filters->account_balance_equality == 'gt', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '>', $balance_value);

                        })
                        ->when($filters->account_balance_equality == 'eq', function ($query) use($balance_value) {

                            return $query->where(DB::raw('COALESCE(ppt1.running_total, 0)'), '=', $balance_value);

                        });

                }

                if (isset($filters->last_payment_date_equality) && $filters->last_payment_date_equality && isset($filters->last_payment_date) && $filters->last_payment_date) {

                    $last_date = $filters->last_payment_date;

                    $users
                        ->when($filters->last_payment_date_equality == 'lt', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '<', $last_date);
                            });

                        })
                        ->when($filters->last_payment_date_equality == 'gt', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '>', $last_date);
                            });

                        })
                        ->when($filters->last_payment_date_equality == 'eq', function ($query) use($last_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($last_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('last_generation_date', '=', $last_date);
                            });

                        });

                }

                if (isset($filters->next_payment_date_equality) && $filters->next_payment_date_equality && isset($filters->next_payment_date) && $filters->next_payment_date) {

                    $next_payment_date = $filters->next_payment_date;

                    $users
                        ->when($filters->next_payment_date_equality == 'lt', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '<', $next_payment_date);
                            });

                        })
                        ->when($filters->next_payment_date_equality == 'gt', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '>', $next_payment_date);
                            });
                            
                        })
                        ->when($filters->next_payment_date_equality == 'eq', function ($query) use($next_payment_date) {

                            return $query->whereHas('paymentSchedules', function($subquery) use($next_payment_date) {
                                $subquery->where('status', '=', 'active')
                                    ->whereDate('next_generation_date', '=', $next_payment_date);
                            });

                        });

                }

                $users
                    ->when(isset($filters->primary_payer) && $filters->primary_payer !== 'all', function ($query) use($filters) {
                        
                        return $query->whereHas('child', function($subquery) use($filters) {
                            $subquery->where('primary_payer', '=', $filters->primary_payer == 'yes' ? true : false);
                        });

                    })
                    ->when(isset($filters->parent_status) && $filters->parent_status !== 'all', function ($query) use($filters) {
                        
                        return $query->where('status', '=', $filters->parent_status);
                    });

            }

            $users = $users->get();

            return (new UserResourceCollection($users, ['basic' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {
            
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }
    }

    public function waiveFeePreviewData(Request $request)
    {

        try {

            $start_date = $request->input('start_date');
            $end_date = $request->input('end_date');
            $week_days = $request->input('days');
            $dec_user_ids = Helpers::decodeHashedID($request->input('parents'));

            $date_range_obj_arr = CarbonPeriod::create($start_date, $end_date)->toArray();

            $date_rage_arr = array_filter($date_range_obj_arr, function($val) use($week_days) {
                return $week_days[Carbon::parse($val)->dayOfWeek] === true;
            });

            $date_rage_arr = array_values(array_map(function($val) {
                return Carbon::parse($val)->format('Y-m-d');
            }, $date_rage_arr));

            $transaction_query = function($query) use($date_rage_arr) {

                $query
                    ->whereIn('date', $date_rage_arr)
                    ->where('reversed', '=', false)
                    ->where(function($subquery) {
                        $subquery
                            ->where('transaction_type', '=', 'fee')
                            ->orWhere('transaction_type', '=', 'subsidy_estimate')
                            ->orWhere('transaction_type', '=', 'ccs_payment')
                            ->orWhere('transaction_type', '=', 'accs_payment');
                    })
                    ->orderBy('child_id')
                    ->orderBy('date')
                    ->orderBy('transaction_type');

            };

            $child_query = function($query) {
                $query->where('primary_payer', '=', true)->where('status', '=', '1');
            };

            $users = $this->userRepo
                ->with([
                    'child' => $child_query,
                    'transactions' => $transaction_query
                ])
                ->whereIn('id', $dec_user_ids)
                ->whereHas('transactions', $transaction_query)
                ->whereHas('child', $child_query)
                ->get();

            foreach ($users as $user) {

                $user_gap = 0;

                foreach ($user->child as $child) {

                    $child_transactions = $user->transactions->filter(function($val) use($child) {return $val->child_id == $child->id;});
                    $child_debit_sum = $child_transactions->filter(function($val) {return $val->mode === 'debit';})->sum('amount');
                    $child_credit_sum = $child_transactions->filter(function($val) {return $val->mode === 'credit';})->sum('amount');
                    $gap = $child_debit_sum - $child_credit_sum;
                    $rounded_gap = max(round($gap, 5), 0);

                    $child['transactions'] = array_values($child_transactions->toArray());
                    $child['debit_total'] = $child_debit_sum;
                    $child['credit_total'] = $child_credit_sum;
                    $child['gap_fee'] = $rounded_gap;
                    $child['selected'] = false;

                    $user_gap = $user_gap + $rounded_gap;
                }

                $user['selected'] = false;
                $user['expand'] = false;
                $user['child_intermediate_checked'] = false;
                $user['child_all_checked'] = false;
                $user['gap_fee'] = $user_gap;

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $users
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }
    }

    public function waiveFeeAdjust(Request $request)
    {

        DB::beginTransaction();

        try {

            $start_date = $request->input('start_date');
            $end_date = $request->input('end_date');
            $week_days = $request->input('days');
            $dec_user_ids = Helpers::decodeHashedID($request->input('parent_ids'));
            $dec_child_ids = Helpers::decodeHashedID($request->input('child_ids'));

            $day_names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

            $formatted_days = array_values(array_map(function($val, $index) use($day_names) {
                return [
                  'index' => $index,
                  'day' => $day_names[$index],
                  'value' => $val  
                ];
            }, $week_days, array_keys($week_days)));

            $date_range_obj_arr = CarbonPeriod::create($start_date, $end_date)->toArray();

            $date_rage_arr = array_filter($date_range_obj_arr, function($val) use($week_days) {
                return $week_days[Carbon::parse($val)->dayOfWeek] === true;
            });

            $date_rage_arr = array_values(array_map(function($val) {
                return Carbon::parse($val)->format('Y-m-d');
            }, $date_rage_arr));

            $transaction_query = function($query) use($date_rage_arr, $dec_child_ids) {

                $query
                    ->whereIn('child_id', $dec_child_ids)
                    ->whereIn('date', $date_rage_arr)
                    ->where('reversed', '=', false)
                    ->where(function($subquery) {
                        $subquery
                            ->where('transaction_type', '=', 'fee')
                            ->orWhere('transaction_type', '=', 'subsidy_estimate')
                            ->orWhere('transaction_type', '=', 'ccs_payment')
                            ->orWhere('transaction_type', '=', 'accs_payment');
                    })
                    ->orderBy('child_id')
                    ->orderBy('date')
                    ->orderBy('transaction_type');

            };

            $child_query = function($query) use($dec_child_ids) {

                $query
                    ->whereIn('child_id', $dec_child_ids);

            };

            $users = $this->userRepo
                ->with([
                    'child' => $child_query,
                    'transactions' => $transaction_query
                ])
                ->whereIn('id', $dec_user_ids)
                ->whereHas('transactions', $transaction_query)
                ->get();


            $item = AdjustmentItem::where('name', '=', PaymentHelpers::PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME);
            $item = $this->attachAccessibilityQuery($item);
            $item = $item->first();

            $auth_user = auth()->user();
            $org_id = $auth_user->organization_id;
            $branch_id = $auth_user->branch_id;

            if (is_null($item)) {

                $item = new AdjustmentItem();
                $item->organization_id = $org_id;
                $item->branch_id = $branch_id;
                $item->name = PaymentHelpers::PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME;
                $item->description = PaymentHelpers::PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME;
                $item->save();

            }

            foreach ($users as $user) {

                foreach ($user->child as $child) {

                    $child_transactions = $user->transactions->filter(function($val) use($child) {return $val->child_id == $child->id;});
                    $child_debit_sum = $child_transactions->filter(function($val) {return $val->mode === 'debit';})->sum('amount');
                    $child_credit_sum = $child_transactions->filter(function($val) {return $val->mode === 'credit';})->sum('amount');
                    $gap = $child_debit_sum - $child_credit_sum;
                    $rounded_gap = max(round($gap, 5), 0);
                    
                    if ($rounded_gap > 0) {

                        $date = Carbon::now();

                        $adjustmentHeader = new ParentPaymentAdjustmentsHeader();
                        $adjustmentHeader->organization_id = $org_id;
                        $adjustmentHeader->branch_id = $branch_id;
                        $adjustmentHeader->item_id = $item->id;
                        $adjustmentHeader->start_date = $start_date;
                        $adjustmentHeader->end_date = $end_date;
                        $adjustmentHeader->type = 'other_fee';
                        $adjustmentHeader->amount = $rounded_gap;
                        $adjustmentHeader->comments = PaymentHelpers::PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME;
                        $adjustmentHeader->scheduled = false;
                        $adjustmentHeader->properties = ['days' => $formatted_days];
                        $adjustmentHeader->save();

                        $adjustmentDetail = new ParentPaymentAdjustment();
                        $adjustmentDetail->organization_id = $org_id;
                        $adjustmentDetail->branch_id = $branch_id;
                        $adjustmentDetail->child_id = $child->id;
                        $adjustmentDetail->item_id = $item->id;
                        $adjustmentDetail->adjustments_header_id = $adjustmentHeader->id;
                        $adjustmentDetail->date = $date;
                        $adjustmentDetail->scheduled = false;
                        $adjustmentDetail->save();

                        $running = PaymentHelpers::getRunningTotal($user->id, false, $rounded_gap, PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0]);

                        $transaction = new ParentPaymentTransaction();
                        $transaction->organization_id = $org_id;
                        $transaction->branch_id = $branch_id;
                        $transaction->parent_id = $user->id;
                        $transaction->child_id = $child->id;
                        $transaction->ref_id = $adjustmentDetail->id;
                        $transaction->date = $date;
                        $transaction->transaction_type = 'adjustment';
                        $transaction->mode = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0];
                        $transaction->description = PaymentHelpers::PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME;
                        $transaction->amount = $rounded_gap;
                        $transaction->running_total = $running;
                        $transaction->save();

                    }

                }

            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.fee_waived_off')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }
    }

    public function bulkAutoChargeUpdate(Request $request)
    {

        DB::beginTransaction();

        try {

            $auto_charge = $request->input('auto_charge') == true ? true : false;
            $dec_user_ids = Helpers::decodeHashedID($request->input('parents'));

            $schedule_query = function($query) {
                $query->where('status', '=', 'active')->orderBy('id', 'desc');
            };

            $users = $this->userRepo
                ->with(['paymentSchedules' => $schedule_query])
                ->whereIn('id', $dec_user_ids)
                ->whereHas('paymentSchedules', $schedule_query)
                ->get();
            
            $schedules = $users->map(function($val) {
                return $val->paymentSchedules->first();
            });

            $schedule_ids = $schedules->pluck('id');

            $this->paymentPlanRepo->whereIn('id', $schedules->pluck('id'))->update(['auto_charge' => $auto_charge]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {

            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }

    }

}
