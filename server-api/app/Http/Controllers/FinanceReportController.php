<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kinderm8\Enums\RoleType;
use ErrorHandler;
use Exception;
use Helpers;
use CCSHelpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\FinanceReportViewRequest;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\ContactReportResourceCollection;
use Kinderm8\Http\Resources\FinanceReportResourceCollection;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Repositories\FinanceReport\IFinanceReportRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use LocalizationHelper;
use RequestHelper;

class FinanceReportController extends Controller
{
    use UserAccessibility;

    private $financeReportRepo;
    private $userRepo;

    public function __construct(IFinanceReportRepository $financeReportRepo, IUserRepository $userRepo)
    {
        $this->financeReportRepo = $financeReportRepo;
        $this->userRepo = $userRepo;
    }

    public function view(Request $request)
    {

        try {

            // validation
            app(FinanceReportViewRequest::class);

            $report_type = $request->input('type');

            $data = [];

            if ($report_type === 'FIN_ISR') {

                $data = $this->financeReportRepo->incomeSummeryReport($request, 'User');

                return (new UserResourceCollection($data['list'], ['financeAccountsReport' => true, 'ISR' => true]))
                    ->additional([
                        'totalRecords' => $data['actual_count'],
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            } else if ($report_type === 'FIN_WRSR') {

                $ccsPayment = [];
                $data = $this->financeReportRepo->Weekly($request, 'User');
                // \Log::info($data);

                $filters = (object) ["start_date" => $request->input('edate'), 'end_date' => $request->input('sdate')];
                // \Log::info('=====filter object========');
                // \Log::info($filters->start_date);
                // \Log::info($filters->end_date);
                $ccsPayment = CCSHelpers::getCcsPayments($filters, true, false, null, null, false);
                // \Log::info('===== CCS payment from api ========');
                // \Log::info( $ccsPayment);


                // $ccsPayment = [
                //     [
                //     'serviceName' => 'serviceName',
                //     'serviceId' => 'serviceID',
                //     'clearingNumber' => 'clearingDocumentNumber',
                //     'clearingDocumentDate' => 'clearingDocumentDate',
                //     'fiscalYear' => 'paymentFiscalYear',
                //     'sessionReportStartDate' => '2020-09-09',
                //     'amount' => 100
                //     ],
                //     [
                //     'serviceName' => 'serviceName',
                //     'serviceId' => 'serviceID',
                //     'clearingNumber' => 'clearingDocumentNumber',
                //     'clearingDocumentDate' => 'clearingDocumentDate',
                //     'fiscalYear' => 'paymentFiscalYear',
                //     'sessionReportStartDate' => '2020-09-09',
                //     'amount' => 100
                //     ],

                // ];

                return (new UserResourceCollection($data['list'], ['financeAccountsReport' => true, 'FIN_WRSR' => true, 'weekEnding' => $request->input('sdate'), 'weekStarting' => $request->input('edate'), 'ccsPayment' => $ccsPayment]))
                    ->additional([
                        'totalRecords' => $data['actual_count'],
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            } else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Unknown report type'
                    ),
                    RequestType::CODE_400
                );
            }
        } catch (Exception $e) {

            if ($e instanceof ValidationException) {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function agedDebtorsData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->getAgedDebtorsReport($request, 'User');

            if (count($data['list']) == 0) {
                throw new Exception('No records found', 1000);
            }

            $return_data = [
                'report_data' => $data['list'],
                'totalRecords' => $data['actual_count']
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $return_data
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

    public function incomeSummaryReportData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->getIncomeSummaryReport($request, 'User');

            $return_data = [
                'branch' => auth()->user()->branch,
                'week_array' => $data['week_array'],
                'totals' => $data['grand_totals']
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $return_data
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

    public function transactionSummaryReportData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->transactionListingReport($request);

            if (count($data) == 0) {
                throw new Exception('No records found', 1000);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
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

    public function accountBalanceReportData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->accountBalanceReport($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
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

    public function bondReportData(Request $request)
    {
        try {

            // Todo - validation

            $data = $this->financeReportRepo->bondReport($request);

            $groupedByParentChild = [];
            // group bond payments by child-parent combo
            foreach ($data as $key => $item) {
                $groupedByParentChild[(string) $item['child_id'] . 'and' . (string) $item['user_id']][$key] = $item;
            }

            $finalSingleParentChildComboArray = [];

            //            Sum of amount received- sum of amount returned is amount held.
            foreach ($groupedByParentChild as $key => $item) {
                $obj = (object) [];
                $sumRecieved = 0;
                $sumReturned = 0;
                foreach ($groupedByParentChild[$key] as $singlePayment) {
                    if ($singlePayment['type'] == '0') {
                        $sumRecieved = $sumRecieved + $singlePayment['amount'];
                    }
                    if ($singlePayment['type'] == '1') {
                        $sumReturned = $sumReturned + $singlePayment['amount'];
                    }
                }
                $obj->parent = $singlePayment['user']['first_name'] . " " . $singlePayment['user']['last_name'] . ($singlePayment['user']['status'] == '1' ? ' (Inactive)' : '');
                $obj->child = $singlePayment['child']['first_name'] . " " . $singlePayment['child']['middle_name'] . " " . $singlePayment['child']['last_name'] . ($singlePayment['child']['status'] == '0' ? ' (Inactive)' : '');
                $obj->bondReceived =  $sumRecieved;
                $obj->bondReturned = $sumReturned;
                $obj->amountHeld = $sumRecieved - $sumReturned;
                $obj->title = $singlePayment['user_id'] . "and" . $singlePayment['child_id'];
                $obj->type = 'item';
                array_push($finalSingleParentChildComboArray, $obj);
            }

            usort($finalSingleParentChildComboArray, function ($first, $second) {
                return $first->parent <=> $second->parent;
            });

            $totalobj = (object) [];
            $totalobj->parent =  'Total';
            $totalobj->child = '';
            $totalobj->bondReceived =  array_sum(array_column($finalSingleParentChildComboArray, 'bondReceived'));
            $totalobj->bondReturned = array_sum(array_column($finalSingleParentChildComboArray, 'bondReturned'));
            $totalobj->amountHeld = array_sum(array_column($finalSingleParentChildComboArray, 'amountHeld'));
            $totalobj->title = '';
            $totalobj->type = 'total';
            array_push($finalSingleParentChildComboArray, $totalobj);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $finalSingleParentChildComboArray
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

    public function financialAdjustmentsData(Request $request)
    {
        try {

            // Todo - validation

            $data = $this->financeReportRepo->financialAdjustmentData($request);


            $groupedByItem = [];
            foreach ($data as $key => $item) {
                $groupedByItem[$item->item->index][$key] = $item;
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $groupedByItem
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

    public function weeklyRevenueSummaryReportData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->getWeeklyRevenueSummaryReport($request);

            if (count($data) == 0) {
                throw new Exception('No records found', 1000);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
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

    public function projectedWeeklyRevenueSummaryReportData(Request $request)
    {

        try {

            // Todo - validation

            $data = $this->financeReportRepo->getProjectedWeeklyRevenueSummaryReport($request);

            if (count($data) == 0) {
                throw new Exception('No records found', 1000);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
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

    public function gapFeeReportData(Request $request)
    {

        try {


            $data = $this->financeReportRepo->getGapFeeReportData($request);

            if (count($data) == 0) {
                throw new Exception('No records found', ErrorType::CustomValidationErrorCode);
            }

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

    public function openingBalanceReport(Request $request)
    {
        try {

            // Todo - validation

            $data = $this->financeReportRepo->getOpeningBalanceReport($request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
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

    public function bankingSummaryReportData(Request $request)
    {

        try {


            $data = $this->financeReportRepo->bankingSummaryReportData($request);

            if (count($data['list']) == 0) {
                throw new Exception('No records found', ErrorType::CustomValidationErrorCode);
            }

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

    public function getUsers(Request $request)
    {

        try {

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            $accounts = $this->userRepo->with('child')->whereHas('roles', function ($query) {
                $query->where('type', RoleType::PARENTSPORTAL);
            });

            $accounts = $this->attachAccessibilityQuery($accounts);

            if (!is_null($filters)) {

                if (isset($filters->primary_payer) && $filters->primary_payer !== 'all') {

                    $accounts->whereHas('child', function ($query) use ($filters) {
                        $query->where('primary_payer', '=', $filters->primary_payer == 'yes' ? true : false);
                    });
                }

                if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

                    $accounts->where('status', '=', $filters->parent_status);
                }
            }

            $accounts = $accounts->orderBy('first_name', 'asc')->get();

            return (new UserResourceCollection($accounts, ['basic' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
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
