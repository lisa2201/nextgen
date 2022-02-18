<?php

namespace Kinderm8\Repositories\FinanceReport;

use Carbon\Carbon;
use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use CCSHelpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Kinderm8\BondPayment;
use Kinderm8\Booking;
use Kinderm8\CCSEnrolment;
use Kinderm8\CCSEntitlement;
use Kinderm8\CcsFortnights;
use Kinderm8\Child;
use Kinderm8\ParentPaymentAdjustment;
use Kinderm8\ParentPaymentBalanceAdjustment;
use Kinderm8\Room;
use Kinderm8\User;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Http\Resources\ParentPaymentResource;
use Kinderm8\Http\Resources\ParentPaymentResourceCollection;
use Kinderm8\ParentPayment;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use Log;
use PaymentHelpers;

class FinanceReportRepository implements IFinanceReportRepository
{
    use UserAccessibility;

    private $userRepo;
    private $bookingRepo;
    private $bondPayment;
    private $paymentAdjustment;
    private $openingBalance;

    public function __construct(IUserRepository $userRepo, IBookingRepository $bookingRepo, BondPayment $bondPayment, ParentPaymentAdjustment $paymentAdjustment, ParentPaymentBalanceAdjustment $openingBalance)
    {
        $this->userRepo = $userRepo;
        $this->bookingRepo = $bookingRepo;
        $this->bondPayment = $bondPayment;
        $this->openingBalance = $openingBalance;
        $this->bondPayment= $bondPayment;
        $this->paymentAdjustment= $paymentAdjustment;
    }

    public function getAgedDebtorsReport(Request $request, string $user_model)
    {

        $user_ids = Helpers::decodeHashedID($request->input('user'));
        $end_date_obj = Carbon::createFromFormat('Y-m-d', $request->input('edate'));
        $end_date = $end_date_obj->format('Y-m-d');
        $show_prepaid = $request->input('prepaid') === true ? true : false;

        $users = $this->userRepo
            ->with(['child', 'transactions' => function($query) use($end_date) {
                $query->where('date', '<=', $end_date);
            }])
            ->whereIn('id', $user_ids);

        $users = $this->attachAccessibilityQuery($users);

        $users = $users
            ->orderBy('first_name', 'asc')
            ->orderBy('last_name', 'asc')
            ->get();

        $actualCount = $users->count();

        /**
         * Category1 0-7 days
         * Category2 8-14 days
         * Category3 15-30 days
         * Category4 31-60 days
         * Category5 61+ days
        */

        // 0-7 days
        $c1_date_1 = $end_date_obj->copy()->endOfDay();
        $c1_date_2 = $end_date_obj->copy()->subDays(7)->startOfDay();
        // 8-14 days
        $c2_date_1 = $end_date_obj->copy()->subDays(8)->endOfDay();
        $c2_date_2 = $end_date_obj->copy()->subDays(14)->startOfDay();
        // 15-30 days
        $c3_date_1 = $end_date_obj->copy()->subDays(15)->endOfDay();
        $c3_date_2 = $end_date_obj->copy()->subDays(30)->startOfDay();
        // 31-60 days
        $c4_date_1 = $end_date_obj->copy()->subDays(31)->endOfDay();
        $c4_date_2 = $end_date_obj->copy()->subDays(60)->startOfDay();
        // 61+ days
        $c5_date_1 = $end_date_obj->copy()->subDays(61)->endOfDay();

        $data_array = [];

        foreach ($users as $user) {

            $user_transactions = $user->transactions;

            $c1_transactions = $user_transactions->filter(function($transaction) use($c1_date_1, $c1_date_2) {
                return ($transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]) && (Carbon::parse($transaction->date)->between($c1_date_1, $c1_date_2, true));
            });

            $c2_transactions = $user_transactions->filter(function($transaction) use($c2_date_1, $c2_date_2) {
                return ($transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]) && (Carbon::parse($transaction->date)->between($c2_date_1, $c2_date_2, true));
            });

            $c3_transactions = $user_transactions->filter(function($transaction) use($c3_date_1, $c3_date_2) {
                return ($transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]) && (Carbon::parse($transaction->date)->between($c3_date_1, $c3_date_2, true));
            });

            $c4_transactions = $user_transactions->filter(function($transaction) use($c4_date_1, $c4_date_2) {
                return ($transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]) && (Carbon::parse($transaction->date)->between($c4_date_1, $c4_date_2, true));
            });

            $c5_transactions = $user_transactions->filter(function($transaction) use($c5_date_1) {
                return ($transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]) && (Carbon::parse($transaction->date)->lessThanOrEqualTo($c5_date_1));
            });

            $credit_transactions = $user_transactions->filter(function($transaction) {
                return $transaction->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0];
            });

            $c1_amount = $c1_transactions->pluck('amount')->sum();
            $c2_amount = $c2_transactions->pluck('amount')->sum();
            $c3_amount = $c3_transactions->pluck('amount')->sum();
            $c4_amount = $c4_transactions->pluck('amount')->sum();
            $c5_amount = $c5_transactions->pluck('amount')->sum();
            $credit_amount = $credit_transactions->pluck('amount')->sum();

            $amount_arr = [$c5_amount, $c4_amount, $c3_amount, $c2_amount, $c1_amount];

            foreach ($amount_arr as $key => $category_amount) {
                $deduct = min($category_amount, $credit_amount);
                $amount_arr[$key] = $category_amount - $deduct;
                $credit_amount = $credit_amount - $deduct;
            }

            $child_names = $user->child->map(function($value) {
                return $value->first_name . ' ' . $value->last_name;
            });

            $user_row = [
                'full_name' => $user->first_name . ' ' . $user->last_name,
                'children' => join(',', $child_names->toArray()),
                'category1' => $amount_arr[4],
                'category2' => $amount_arr[3],
                'category3' => $amount_arr[2],
                'category4' => $amount_arr[1],
                'category5' => $amount_arr[0],
                'prepaid' => $credit_amount,
                'user_total' => array_sum($amount_arr),
                'email' => $user->email,
                'phone' => $user->phone,
                'type' => 'user'
            ];

            array_push($data_array, $user_row);
        }

        $c1_total = array_sum(array_column($data_array, 'category1'));
        $c2_total = array_sum(array_column($data_array, 'category2'));
        $c3_total = array_sum(array_column($data_array, 'category3'));
        $c4_total = array_sum(array_column($data_array, 'category4'));
        $c5_total = array_sum(array_column($data_array, 'category5'));
        $prepaid_total = array_sum(array_column($data_array, 'prepaid'));
        $users_sum = array_sum(array_column($data_array, 'user_total'));

        array_push($data_array, [
            'full_name' => 'Total',
            'children' => '',
            'category1' => $c1_total,
            'category2' => $c2_total,
            'category3' => $c3_total,
            'category4' => $c4_total,
            'category5' => $c5_total,
            'prepaid' => $prepaid_total,
            'user_total' => $users_sum,
            'email' => '',
            'phone' => '',
            'type' => 'total'
        ]);

        $final_array = array_values(array_filter($data_array, function($obj) use($show_prepaid) {
            if ($show_prepaid) {
                // total owing > 0 || prepaid > 0
                return (($obj['user_total'] > 0) || ($obj['prepaid'] > 0));
            } else {
                // total owing > 0
                return $obj['user_total'] > 0;
             }
        }));

        return [
            'list' => $final_array,
            'actual_count' => $actualCount
        ];

    }

    public function getIncomeSummaryReport(Request $request, string $user_model)
    {

        $week_array = [];
        $format = 'Y-m-d';
        $start_date = Carbon::createFromFormat($format, $request->input('sdate'));
        $end_date = Carbon::createFromFormat($format, $request->input('edate'));
        $week_start = Carbon::parse($start_date)->startOfWeek();
        $week_end = Carbon::parse($start_date)->endOfWeek();
        $parent_ids = Helpers::decodeHashedID($request->input('user'));

        $transactions = ParentPaymentTransaction::where('date', '>=', $start_date)
            ->where('date', '<=', $end_date)
            ->whereIn('parent_id', $parent_ids)
            ->where('reversed', '=', false);

        $transactions = $this->attachAccessibilityQuery($transactions);

        $transactions = $transactions->get();

        $transaction_users = $this->userRepo->whereHas('roles', function($query)
            {
                $query->where('type', RoleType::PARENTSPORTAL);
            })
            ->whereHas('child', function($query) {
                $query->where('primary_payer', '=', true);
            });

        $transaction_users = $this->attachAccessibilityQuery($transaction_users);

        $transaction_users = $transaction_users->orderBy('first_name', 'asc')->get();

        do {

            array_push($week_array, [
                'week_start' => $week_start->format($format),
                'week_end' => $week_end->format($format)
            ]);

            $week_start->addDays(7);
            $week_end->addDays(7);

        } while ($end_date->greaterThanOrEqualTo($week_start));

        $ccs_total = 0;
        $fee_total = 0;
        $parent_total = 0;

        foreach ($week_array as $week_key => $week_obj) {

            $week_transactions = $transactions->filter(function($val) use($week_obj) {
                return Carbon::parse($val->date)->isBetween(Carbon::parse($week_obj['week_start']), Carbon::parse($week_obj['week_end']));
            });

            $users_arr = [];

            foreach ($transaction_users as $user) {

                $user_transactions = $week_transactions->filter(function ($val) use($user) {
                    return $val->parent_id === $user->id;
                });

                $fee = array_sum(array_map(function ($val) {
                    return $val['transaction_type'] === 'parent_payment' && $val['mode'] === 'credit' ? $val['amount'] : 0;
                }, $user_transactions->toArray()));

                $ccs = array_sum(array_map(function ($val) {
                    return (($val['transaction_type'] === 'ccs_payment' || $val['transaction_type'] === 'accs_payment') && $val['mode'] === 'credit') ? $val['amount'] : 0;
                }, $user_transactions->toArray()));

                array_push($users_arr, [
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'fee' => $fee,
                    'ccs' => $ccs,
                    'parent_total' => $fee + $ccs,
                    'type' => 'parent'
                ]);

            }

            $fee_sub = array_sum(array_column($users_arr, 'fee'));
            $css_sub = array_sum(array_column($users_arr, 'ccs'));
            $parent_sub = array_sum(array_column($users_arr, 'parent_total'));

            array_push($users_arr, [
                'first_name' => '',
                'last_name' => '',
                'fee' => $fee_sub,
                'ccs' => $css_sub,
                'parent_total' => $parent_sub,
                'type' => 'subtotal'
            ]);

            $fee_total += $fee_sub;
            $ccs_total += $css_sub;
            $parent_total += $parent_sub;

            $week_array[$week_key]['users_array'] = $users_arr;

        }

        $totals = [
            'fee' => $fee_total,
            'ccs' => $ccs_total,
            'parent_total' => $parent_total
        ];

        return [
            'week_array' => $week_array,
            'grand_totals' => $totals
        ];

    }

    public function incomeSummeryReport(Request $request, string $user_model)
    {

        $user_ids = [];

        foreach(json_decode($request->input('user')) as $user){

            array_push($user_ids, Helpers::decodeHashedID($user));
        }

        $data = $this->userRepo->with([
            'paymentSchedules' => function ($query) {
                $query->orderBy('id', 'desc');
            },
            'transactions' => function ($query) {
                $query->orderBy('id', 'desc');
            }
        ])
        ->whereIn('id', $user_ids)
        ->whereHas('transactions', function($query)use($request) {
            $query->whereIn('id', function($qu) {
                $qu->selectRaw('max(id)')
                    ->from('km8_parent_payment_transactions')
                    ->groupBy('parent_id');
            })->where('running_total', '>', 0)
            ->whereBetween('date', [$request->input('sdate'), $request->input('edate')]);
        });
        // ->whereHas('paymentSchedules', function ($query) {
        //     $query->where('status', '=', 'active')
        //         ->where('next_generation_date', '<=', Carbon::now()->format('Y-m-d'));
        // });

        $data = $this->attachAccessibilityQuery($data);

        $data = $data->get();
        $actualCount = $data->count();

        return [
            'list' => $data,
            'actual_count' => $actualCount,
        ];

    }

    public function transactionListingReport(Request $request)
    {

        $format = 'Y-m-d';
        $start_date = Carbon::createFromFormat($format, $request->input('sdate'));
        $end_date = Carbon::createFromFormat($format, $request->input('edate'));
        $parent_ids = Helpers::decodeHashedID($request->input('user'));

        $data_array = [];

        $transactions = ParentPaymentTransaction::where('km8_parent_payment_transactions.date', '>=', $start_date)
            ->where('km8_parent_payment_transactions.date', '<=', $end_date)
            ->whereIn('km8_parent_payment_transactions.parent_id', $parent_ids)
            ->where('km8_parent_payment_transactions.reversed', '=', false)
            ->leftJoin('km8_parent_payment_adjustments', 'km8_parent_payment_adjustments.id', '=', 'km8_parent_payment_transactions.ref_id')
            ->leftJoin('km8_parent_payment_adjustments_headers', 'km8_parent_payment_adjustments_headers.id', '=', 'km8_parent_payment_adjustments.adjustments_header_id')
            ->leftJoin('km8_adjustment_items', 'km8_adjustment_items.id', '=', 'km8_parent_payment_adjustments_headers.item_id');


        $transactions = $this->attachAccessibilityQuery($transactions, null, 'km8_parent_payment_transactions');

        $transactions = $transactions->select('km8_parent_payment_transactions.*', 'km8_adjustment_items.name AS item_name', 'km8_adjustment_items.id AS item_id')->get();

        $fee_transactions = $transactions->filter(function($val) {
            return $val->transaction_type === 'fee';
        });

        $ccs_transactions = $transactions->filter(function($val) {
            return $val->transaction_type === 'ccs_payment';
        });

        $accs_transactions = $transactions->filter(function($val) {
            return $val->transaction_type === 'accs_payment';
        });

        $parent_payment_transactions = $transactions->filter(function($val) {
            return $val->transaction_type === 'parent_payment';
        });

        $item_ids = $transactions->filter(function ($val) { return $val->item_id != null && $val->transaction_type === 'adjustment'; })->pluck('item_id')->unique();

        array_push($data_array, [
            'name' => 'Attendance Fee',
            'type' => 'fee',
            'mode' => 'credit',
            'credit_amount' => $fee_transactions->sum('amount'),
            'debit_amount' => null,
            'total' => ($fee_transactions->sum('amount') * -1)
        ]);

        array_push($data_array, [
            'name' => 'CCS Payment',
            'type' => 'ccs_payment',
            'mode' => 'debit',
            'debit_amount' => $ccs_transactions->sum('amount'),
            'credit_amount' => null,
            'total' => $ccs_transactions->sum('amount')
        ]);

        array_push($data_array, [
            'name' => 'ACCS Payment',
            'type' => 'accs_payment',
            'mode' => 'debit',
            'debit_amount' => $accs_transactions->sum('amount'),
            'credit_amount' => null,
            'total' => $accs_transactions->sum('amount')
        ]);

        array_push($data_array, [
            'name' => 'Fee Payment',
            'type' => 'parent_payment',
            'mode' => 'debit',
            'debit_amount' => $parent_payment_transactions->sum('amount'),
            'credit_amount' => null,
            'total' => $parent_payment_transactions->sum('amount')
        ]);

        // foreach ($item_ids as $item_id) {

        //     $adjustment_transactions = $transactions->filter(function($val) use($item_id) {
        //         return $val->item_id === $item_id;
        //     });

        //     $rec = $adjustment_transactions->first();
        //     $amount = $adjustment_transactions->sum('amount');

        //     $obj = [
        //         'name' => $rec->item_name,
        //         'type' => $rec->transaction_type,
        //         'mode' => $rec->mode,
        //         'total' => $rec->mode === 'credit' ? ($amount * -1) : $amount
        //     ];

        //     if ($rec->mode === 'debit') {
        //         $obj['debit_amount'] = $amount;
        //         $obj['credit_amount'] = null;
        //     } else {
        //         $obj['credit_amount'] = $amount;
        //         $obj['debit_amount'] = null;
        //     }

        //     array_push($data_array, $obj);

        // }

        $credit_total = array_sum(array_column($data_array, 'credit_amount'));
        $debit_total = array_sum(array_column($data_array, 'debit_amount'));
        $grand_total = array_sum(array_column($data_array, 'total'));

        array_push($data_array, [
            'name' => 'Total',
            'type' => 'total',
            'mode' => null,
            'debit_amount' => $debit_total,
            'credit_amount' => $credit_total,
            'total' => $grand_total
        ]);

        return $data_array;

    }

    public function accountBalanceReport(Request $request)
    {

        $format = 'Y-m-d';
        $user_ids = Helpers::decodeHashedID($request->input('user'));
        $end_date = Carbon::createFromFormat($format, $request->input('edate'));

        $users = $this->userRepo
            ->whereHas('roles', function($query) {
                $query->where('type', RoleType::PARENTSPORTAL);
            })->whereHas('child', function($query) {
                $query->where('primary_payer', '=', true);
            })
            ->whereIn('id', $user_ids);

        $users = $this->attachAccessibilityQuery($users);
        $users = $users->orderBy('first_name', 'asc')->get();

        $transactions = DB::table(with(new ParentPaymentTransaction)->getTable())
            ->whereNull('deleted_at')
            ->whereIn('id', function ($query) use($end_date) {
                $query->selectRaw('MAX(id)')
                    ->from(with(new ParentPaymentTransaction)->getTable())
                    ->whereDate('created_at', '<=', $end_date)
                    ->groupBy('parent_id');
            })
            ->select('parent_id', 'transaction_type', 'running_total')
            ->get();

        $credit_data = [];
        $debit_data = [];

        $transaction_parent_ids = array_column($transactions->toArray(), 'parent_id');

        foreach ($users as $user) {

            $user_name = $user->first_name . ' ' . $user->last_name;
            $email = $user->email ? $user->email : '';;
            $phone = $user->phone ? $user->phone : '';

            $index = array_search($user->id, $transaction_parent_ids);

            if ($index === false) {
                array_push($debit_data, [
                    'account_name' => $user_name,
                    'email' => $email,
                    'phone' =>$phone,
                    'balance' => 0,
                    'type' => 'parent'
                ]);
            } else {

                $balance = floatval($transactions[$index]->running_total);

                if ($balance < 0) {
                    array_push($credit_data, [
                        'account_name' => $user_name,
                        'email' => $email,
                        'phone' => $phone,
                        'balance' => $balance,
                        'type' => 'parent'
                    ]);
                } else {
                    array_push($debit_data, [
                        'account_name' => $user_name,
                        'email' => $email,
                        'phone' => $phone,
                        'balance' => $balance,
                        'type' => 'parent'
                    ]);
                }

            }

        }

        $credit_total = array_sum(array_column($credit_data, 'balance'));
        $debit_total = array_sum(array_column($debit_data, 'balance'));

        if (count($debit_data) > 0) {
            array_push($debit_data, [
                'account_name' => 'Total Debt Balance',
                'email' => '',
                'phone' => '',
                'balance' => $debit_total,
                'type' => 'total'
            ]);
        }

        if (count($credit_data) > 0) {
            array_push($credit_data, [
                'account_name' => 'Total Credit Balance',
                'email' => '',
                'phone' => '',
                'balance' => $credit_total,
                'type' => 'total'
            ]);
        }


        return [
            'credit_data' => $credit_data,
            'debit_data' => $debit_data,
            'grand_total' => $credit_total + $debit_total
        ];

    }

    public function bondReport(Request $request)
    {

        $status = $request->input('status_toggle');



        if($request->input('filterBy') == 'PARENT')
        {
            $user_ids = Helpers::decodeHashedID($request->input('user'));

            if($status!= true)
            {
                // if the status toggle is false (Show Inactive Staff/Children toggle is off),  don't get inactive parents (remove them from the array)
                foreach($user_ids as $user_id)
                {
                    if(User::find($user_id)->status == 1)
                    {
                        if (($key = array_search($user_id, $user_ids)) !== false) {
                            unset($user_ids[$key]);
                        }
                    }
                }
            }

            $bondPayments = $this->bondPayment
                ->with('user')
                ->with('child')
                // ->join('km8_users','km8_users.id', '=', 'km8_bond_payemt.user_id')
                ->whereIn('user_id', $user_ids);
        }
        else
        {
            $rooms = Helpers::decodeHashedID($request->input('room'));
            $children = [];

            foreach($rooms as $room)
            {
                $room = Room::find($room);

                if($status!= true)
                {
                    // if the status toggle is false (Show Inactive Staff/Children toggle is off),  don't get inactive children
                    $roomChildren = $room->child()->where('status',1)->pluck('id');
                }
                else
                {
                    $roomChildren = $room->child()->pluck('id');
                }
                foreach($roomChildren as $roomChild)
                {
                    array_push($children,$roomChild);
                }

            }
            $bondPayments = $this->bondPayment
                ->with('user')
                ->with('child')
                ->whereIn('child_id',$children);

        }
        $bondPayments = $this->attachAccessibilityQuery($bondPayments);
        $startDate = $request->input('sdate');
        $endDate = $request->input('edate');
        $bondPayments = $bondPayments->whereBetween('date',[$startDate, $endDate]);


        $bondPayments = $bondPayments->get();
        return $bondPayments;
    }

    public function financialAdjustmentData(Request $request)
    {
        $startDate = $request->input('sdate');
        $endDate = $request->input('edate');
        $adjustments = $this->paymentAdjustment
            ->with('child','item', 'header');
        $adjustments = $this->attachAccessibilityQuery($adjustments);
        $adjustments = $adjustments->whereBetween('date',[$startDate, $endDate]);

        $adjustments = $adjustments->get();

        return $adjustments;
    }

    public function getWeeklyRevenueSummaryReport(Request $request)
    {

        $week_array = [];
        $format = 'Y-m-d';
        $start_date = Carbon::createFromFormat($format, $request->input('sdate'));
        $end_date = Carbon::createFromFormat($format, $request->input('edate'));
        $week_start = Carbon::parse($start_date)->startOfWeek();
        $week_end = Carbon::parse($start_date)->endOfWeek();

        do {

            array_push($week_array, [
                'week_start' => $week_start->format($format),
                'week_end' => $week_end->format($format)
            ]);

            $week_start->addDays(7);
            $week_end->addDays(7);

        } while ($end_date->greaterThanOrEqualTo($week_start));

        $actual_start_date = Carbon::createFromFormat($format, $week_array[0]['week_start']);
        $actual_end_date = Carbon::createFromFormat($format, $week_array[count($week_array) - 1]['week_end']);

        $transactions = ParentPaymentTransaction::where('date', '>=', $actual_start_date)
            ->where('date', '<=', $actual_end_date)
            ->where('reversed', '=', false);
        $transactions = $this->attachAccessibilityQuery($transactions);
        $transactions = $transactions->get();

        $fee_transactions = $transactions->filter(function($val) {
            return $val->transaction_type === 'fee';
        });

        $bookings = $this->bookingRepo->where('date', '>=', $actual_start_date)
            ->where('date', '<=', $actual_end_date)
            ->whereIn('id', $fee_transactions->pluck('ref_id'))
            ->get();

        $report_data = [];

        foreach ($week_array as $week_key => $week_obj) {

            $week_transactions = $transactions->filter(function($val) use($week_obj) {
                return Carbon::parse($val->date)->isBetween(Carbon::parse($week_obj['week_start']), Carbon::parse($week_obj['week_end']));
            });

            $week_bookings = $bookings->filter(function($val) use($week_obj) {
                return Carbon::parse($val->date)->isBetween(Carbon::parse($week_obj['week_start']), Carbon::parse($week_obj['week_end']));
            });

            $hours_arr = $week_bookings->map(function($val) {
                return (($val->session_end - $val->session_start) / 60);
            });

            $week_booking_transactions = $week_transactions->filter(function($val) {
                return $val->transaction_type === 'fee';
            });

            $week_ccs_transactions = $week_transactions->filter(function($val) {
                return $val->transaction_type === 'ccs_payment' || $val->transaction_type === 'accs_payment' || $val->transaction_type === 'subsidy_estimate';
            });

            $week_other_fees = $week_transactions->filter(function($val) {
                return $val->transaction_type === 'adjustment' && $val->mode === 'debit';
            });

            $week_discounts = $week_transactions->filter(function($val) {
                return $val->transaction_type === 'adjustment' && $val->mode === 'credit';
            });

            $fee_sum = $week_booking_transactions->sum('amount');
            $ccs_sum = $week_ccs_transactions->sum('amount');
            $debit_sum = $week_other_fees->sum('amount');
            $credit_sum = $week_discounts->sum('amount');

            $item = [
                'week_start' => $week_obj['week_start'],
                'week_end' => $week_obj['week_end'],
                'fee' => $fee_sum,
                'ccs' => $ccs_sum,
                'gap' => $fee_sum - $ccs_sum,
                'credit' => $credit_sum,
                'debit' => $debit_sum,
                'booking_hours' => $hours_arr->sum(),
                'total' => (($fee_sum + $debit_sum) - $credit_sum),
                'type' => 'week'
            ];

            array_push($report_data, $item);

        }

        $fee_total = array_sum(array_column($report_data, 'fee'));
        $ccs_total = array_sum(array_column($report_data, 'ccs'));
        $gap_total = array_sum(array_column($report_data, 'gap'));
        $credit_total = array_sum(array_column($report_data, 'credit'));
        $debit_total = array_sum(array_column($report_data, 'debit'));
        $hours_total = array_sum(array_column($report_data, 'booking_hours'));

        array_push($report_data, [
            'week_start' => 'Total',
            'week_end' => 'Total',
            'fee' => $fee_total,
            'ccs' => $ccs_total,
            'gap' => $gap_total,
            'credit' => $credit_total,
            'debit' => $debit_total,
            'booking_hours' => $hours_total,
            'total' => (($fee_total + $debit_total) - $credit_total),
            'type' => 'total'
        ]);

        return $report_data;

    }

    public function getProjectedWeeklyRevenueSummaryReport(Request $request)
    {

        $week_array = [];
        $format = 'Y-m-d';
        $start_date = Carbon::createFromFormat($format, $request->input('sdate'));
        $end_date = Carbon::createFromFormat($format, $request->input('edate'));
        $week_start = Carbon::parse($start_date)->startOfWeek();
        $week_end = Carbon::parse($start_date)->endOfWeek();

        do {

            array_push($week_array, [
                'week_start' => $week_start->format($format),
                'week_end' => $week_end->format($format)
            ]);

            $week_start->addDays(7);
            $week_end->addDays(7);

        } while ($end_date->greaterThanOrEqualTo($week_start));

        $actual_start_date = Carbon::createFromFormat($format, $week_array[0]['week_start']);
        $actual_end_date = Carbon::createFromFormat($format, $week_array[count($week_array) - 1]['week_end']);

        $bookings = Booking::with(['fee', 'child'])
            ->whereHas('child', function($query) {
                $query->where('status', '=', '1')->where('deleted_at', '=', null);
            })
            ->where('date', '>=', $actual_start_date)
            ->where('date', '<=', $actual_end_date);

        $bookings = $this->attachAccessibilityQuery($bookings);
        $bookings = $bookings->get();

        $rooms = Room::where('status', '=', '0');
        $rooms = $this->attachAccessibilityQuery($rooms);
        $rooms = $rooms->get();

        $entitlements = CCSEntitlement::whereIn('id', function($query) {
            
            $query->select(DB::raw('MAX(id)'))->from(with(new CCSEntitlement)->getTable())->groupBy('enrolment_id');
            
        });
        $entitlements = $this->attachAccessibilityQuery($entitlements);
        $entitlements = $entitlements->get();
        
        $enrolments = CCSEnrolment::whereIn('child_id', $bookings->pluck('child_id'))->where('status', '=', 'CONFIR')->get();

        $service = auth()->user()->branch->providerService;

        $report_data = [];
        $mod_bookings = [];
        $week_summary = [];

        foreach ($week_array as $week_key => $week_obj) {

            $week_bookings = $bookings->filter(function($val) use($week_obj) {
                return Carbon::parse($val->date)->isBetween(Carbon::parse($week_obj['week_start']), Carbon::parse($week_obj['week_end']));
            });

            $week_report_data = [];

            foreach ($rooms as $room) {

                $room_bookings = $week_bookings->filter(function($val) use($room) {
                    return $val->room_id == $room->id;
                });

                $child_group_bookings = Helpers::array_group_by($room_bookings->toArray(), 'child_id');
    
                $ccs_estimate = 0;
    
                foreach ($child_group_bookings as $child_id => $child_bookings) {
    
                    $enrol_index = array_search($child_id, array_column($enrolments->toArray(), 'child_id'));
                    
                    if ($enrol_index !== false && $service) {
                        
                        $child_enrolment = $enrolments[$enrol_index];
                        $entitlement_index = array_search($child_enrolment['enrolment_id'], array_column($entitlements->toArray(), 'enrolment_id'));
                        $hourly_rate_cap = $service['service_type'] == 'ZCDC' ? PaymentHelpers::CENTER_BASED_CARE_HOURLY_CAP : PaymentHelpers::OUTSIDE_SCHOOL_CARE_HOURLY_CAP;
                        
                        if ($entitlement_index !== false) {
    
                            $child_entitlement = $entitlements[$entitlement_index];
    
                            if ($child_entitlement['annual_cap_reached'] == false) {
    
                                foreach ($child_bookings as $booking) {
    
                                    $ccs_fortnights = CcsFortnights::whereRaw('? BETWEEN start_date AND end_date', $booking['date'])->first();
    
                                    if ($booking['session_end'] < $booking['session_start']) {
                                        continue;
                                    }
    
                                    $school_aged = Carbon::parse($booking['child']['dob'])->diffInDays(Carbon::now()) >= 2190 ? true : false;
    
                                    $total_booked_hours = (($booking['session_end'] - $booking['session_start']) / 60);
                                    $total_booked_price = PaymentHelpers::calculateBookingFee($booking);
    
                                    $existing_records = array_filter($mod_bookings, function($item) use($child_id, $ccs_fortnights) {
                                        $start = Carbon::parse($ccs_fortnights['start_date']);
                                        $end = Carbon::parse($ccs_fortnights['end_date']);
                                        $book_date = Carbon::parse($item['date']);
                                        return $item['child_id'] == $child_id && $book_date->between($start, $end, true);
                                    });
    
                                    $existing_hours = array_sum(array_column($existing_records, 'hours'));
                                    $ccs_total_hours = $child_entitlement['pre_school_excemption'] == 'Y' ? 36 : $child_entitlement['ccs_total_hours'];
                                    $ccs_hours = $ccs_total_hours - $existing_hours;
                                    // check sign and assign ccs hours
                                    $available_ccs_hours = (Helpers::getSign($ccs_hours) == -1 || Helpers::getSign($ccs_hours) == 0) ? 0 : $ccs_hours;
                                    $subsidised_hours = min($available_ccs_hours, $total_booked_hours);
                                    
                                    if ($school_aged && $service['service_type'] === 'ZCDC') {
                                        $hourly_rate_cap = PaymentHelpers::OUTSIDE_SCHOOL_CARE_HOURLY_CAP;
                                    } else if (($school_aged === false) && ($service['service_type'] === 'ZOSH')) {
                                        $hourly_rate_cap = PaymentHelpers::CENTER_BASED_CARE_HOURLY_CAP;
                                    }
    
                                    $subsidised_rate = $total_booked_hours == 0 ? 0 : min(($total_booked_price/$total_booked_hours), $hourly_rate_cap);
                                    $withholding_percent = $child_entitlement['ccs_withholding_percentage'] == 0 ? 1 : (1 - ($child_entitlement['ccs_withholding_percentage']/100)); 
                                    $ccs_percentage = $child_entitlement['ccs_percentage'] / 100;
                                    $estimate_amount = $subsidised_hours * $subsidised_rate * $ccs_percentage * $withholding_percent;
    
                                    if ($estimate_amount > 0) {
                                        
                                        $ccs_estimate = $ccs_estimate + $estimate_amount;
    
                                        array_push($mod_bookings, [
                                            'id' => $booking['index'],
                                            'date' => $booking['date'],
                                            'child_id' => $booking['child_id'],
                                            'hours' => $subsidised_hours
                                        ]);
                                    }
    
                                }
    
                            }
    
                        }
    
                    }
    
                }
    
                foreach ($week_bookings as $booking) {
    
                    $booking['calculated_fee'] = PaymentHelpers::calculateBookingFee($booking);
    
                }
               
                $item = [
                    'week_start' => $week_obj['week_start'],
                    'week_end' => $week_obj['week_end'],
                    'room_name' => $room->title,
                    'room_id' => $room->id,
                    'fee' => $room_bookings->sum('calculated_fee'),
                    'ccs' => $ccs_estimate,
                    'type' => 'week'
                ];
    
                array_push($report_data, $item);
                array_push($week_report_data, $item);
            }

            $fee_room_total = array_sum(array_column($week_report_data, 'fee'));
            $ccs_room_total = array_sum(array_column($week_report_data, 'ccs'));

            $week_total_obj = [
                'week_start' => 'Week Total',
                'week_end' => 'Week Total',
                'fee' => $fee_room_total,
                'ccs' => $ccs_room_total,
                'type' => 'week_total'
            ];

            array_push($report_data, $week_total_obj);
            array_push($week_summary, $week_total_obj);

        }

        $fee_total = array_sum(array_column($week_summary, 'fee'));
        $ccs_total = array_sum(array_column($week_summary, 'ccs'));

        array_push($report_data, [
            'week_start' => 'Center Total',
            'week_end' => 'Center Total',
            'fee' => $fee_total,
            'ccs' => $ccs_total,
            'type' => 'total'
        ]);

        return $report_data;

    }

    public function getOpeningBalanceReport(Request $request)
    {
            try{
                $format = 'Y-m-d';
                $start_date = Carbon::createFromFormat($format, $request->input('sdate'));
                $end_date = Carbon::createFromFormat($format, $request->input('edate'));
                $data = $this->openingBalance->with('parent');
                $data = $this->attachAccessibilityQuery($data);
                $data = $data->whereBetween('date',[$start_date, $end_date]);

                $data = $data->get();
                return $data;
            }
            catch (Exception $e)
            {
                ErrorHandler::log($e);
            }
    }

    public function Weekly(Request $request, string $user_model)
    {

        try
        {

            // \Log::info($request->all());
            // $user_array =  [];
            //     foreach(json_decode($request->input('user')) as $userList) {
            //         $id = Helpers::decodeHashedID($userList);
            //         array_push($user_array, $id);
            //     }

                // $data = app()->make("Kinderm8\\{$user_model}")::with(['child', 'transactions'])->whereHas('transactions', function($query)use($request,$user_array){
                //     $query->whereIn('parent_id', $user_array);
                //     $query->whereBetween('created_at', [$request->input('edate'), $request->input('sdate')])
                //     ->orderBy('id', 'desc');
                // });
                $data = app()->make("Kinderm8\\{$user_model}")::with(['child', 'transactions'])->whereHas('transactions', function($query)use($request){
                    $query->whereBetween('created_at', [$request->input('edate'), $request->input('sdate')])
                    ->orderBy('id', 'desc');
                });
                $data = $data->where('organization_id',auth()->user()->organization_id)
                ->where('branch_id',auth()->user()->branch_id);
                $data = $data->get();

            $actualCount = $data->count();
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $data,
            'actual_count' => $actualCount,
        ];

    }

    public function getGapFeeReportData(Request $request)
    {

        $start_date = $request->input('sdate');
        $end_date = $request->input('edate');
        $dec_user_ids = Helpers::decodeHashedID($request->input('user'));

        $transaction_query = function($query) use($start_date, $end_date) {

            $query
                ->where('date', '>=', $start_date)
                ->where('date', '<=', $end_date)
                ->where('reversed', '=', false)
                ->where(function($subquery) {
                    $subquery
                        ->where('transaction_type', '=', 'fee')
                        ->orWhere('transaction_type', '=', 'subsidy_estimate')
                        ->orWhere('transaction_type', '=', 'ccs_payment')
                        ->orWhere('transaction_type', '=', 'accs_payment');
                })
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
            // ->whereHas('transactions', $transaction_query)
            ->whereHas('child', $child_query)
            ->get();

        
        $final_array = [];
        $total = 0;
        $fee_total = 0;
        $ccs_total = 0;
        $estimate_total = 0;

        foreach ($users as $user) {

            $user_gap = 0;
            $user_fee = 0;
            $user_ccs = 0;
            $user_estimate = 0;

            foreach ($user->child as $child) {

                $child_transactions = $user->transactions->filter(function($val) use($child) {return $val->child_id == $child->id;});
                $child_fee = $child_transactions->filter(function($val) {return $val->transaction_type === 'fee';})->sum('amount');
                $child_estimate = $child_transactions->filter(function($val) {return $val->transaction_type === 'subsidy_estimate';})->sum('amount');
                $child_ccs = $child_transactions->filter(function($val) {return ($val->transaction_type === 'ccs_payment' || $val->transaction_type === 'accs_payment');})->sum('amount');
                $gap = $child_fee - ($child_estimate + $child_ccs);
                $rounded_gap = round($gap, 5);

                $child['child_fee'] = $child_fee;
                $child['child_estimate'] = $child_estimate;
                $child['child_ccs'] = $child_ccs;
                $child['gap_fee'] = $rounded_gap;

                $user_gap = $user_gap + $rounded_gap;
                $user_fee = $user_fee + $child_fee;
                $user_ccs = $user_ccs + $child_ccs;
                $user_estimate = $user_estimate + $child_estimate;

                $total = $total + $rounded_gap;
                $fee_total = $fee_total + $child_fee;
                $ccs_total = $ccs_total + $child_ccs;
                $estimate_total = $estimate_total + $child_estimate;
            }

            $child_names = $user->child->map(function($val) { return $val->full_name; });

            $obj = [
                'name' => $user->full_name,
                'children' => implode(',', $child_names->toArray()),
                'fee' => $user_fee,
                'ccs' => $user_ccs,
                'estimate' => $user_estimate,
                'gap_fee' => $user_gap,
                'type' => 'data'
            ];
    
            array_push($final_array, $obj);


        }

        array_push($final_array, [
            'name' => 'Total',
            'children' => '',
            'fee' => $fee_total,
            'ccs' => $ccs_total,
            'estimate' => $estimate_total,
            'gap_fee' => $total,
            'type' => 'total'
        ]);

        return $final_array;

    }

    public function bankingSummaryReportData(Request $request)
    {

        $start_date = $request->input('sdate');
        $end_date = $request->input('edate');
        $dec_user_ids = Helpers::decodeHashedID($request->input('user'));
        $date_filter_type = $request->input('date_type');

        $payments = ParentPayment::with(['parent', 'paymentMethod'])
            ->whereIn('user_id', $dec_user_ids)
            ->where('status', '=', PaymentHelpers::PARENT_PAYMENT_STATUS[3])
            ->when($date_filter_type == 'payment', function ($query) use($end_date, $start_date) {
                return $query->where('date', '<=', $end_date)->where('date', '>=', $start_date);
            })
            ->when($date_filter_type == 'settlement', function ($query) use($end_date, $start_date) {
                return $query->where('settlement_date', '<=', $end_date)->where('settlement_date', '>=', $start_date);
            })
            ->get()
            ->sortBy('parent.first_name');

        $mapped_payments = $payments->map(function($value) {

            $val = $value;

            if (($val->payment_method_id === null) && ($val->manual_payment_type === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[1])) {
                $val['type_key'] = PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[1];
                $val['type_description'] = "Cash";
            } else if (($val->payment_method_id === null) && ($val->manual_payment_type === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[5])) {
                $val['type_key'] = PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[5];
                $val['type_description'] = "EFTPOS";
            } else if (($val->payment_method_id === null) && ($val->manual_payment_type === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[2])) {
                $val['type_key'] = PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[2];
                $val['type_description'] = "Cheque";
            } else if (($val->payment_method_id === null) && ($val->manual_payment_type === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[6] || $val->manual_payment_type === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[3])) {
                $val['type_key'] = PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[6];
                $val['type_description'] = "Direct Deposit";
            } else if (($val->payment_method_id != null) && ($val->paymentMethod->payment_type === PaymentHelpers::PAYMENT_TYPES[3])) {
                $val['type_key'] = PaymentHelpers::PAYMENT_TYPES[3];
                $val['type_description'] = "BPAY";
            } else if (($val->payment_method_id != null) && ($val->paymentMethod->payment_type === PaymentHelpers::PAYMENT_TYPES[1])) {

                if ($val->paymentMethod->mode === PaymentHelpers::PAYMENT_MODES[0]) {
                    $val['type_key'] = PaymentHelpers::PAYMENT_MODES[0];
                    $val['type_description'] = "Direct Debit";
                } else {
                    $val['type_key'] = PaymentHelpers::PAYMENT_MODES[1];
                    $val['type_description'] = "Credit Card";
                }
                
            }

            return $val;

        });

        $map_keys = [
            PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[1],
            PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[5],
            PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[2],
            PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[6],
            PaymentHelpers::PAYMENT_TYPES[3],
            PaymentHelpers::PAYMENT_TYPES[1],
        ];
        

        $cash_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[1];
        });

        $fpos_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[5];
        });

        $cheque_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[2];
        });

        $direct_deposit_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PARENT_PAYMENT_MANUAL_PAYMENT_TYPE[6];
        });

        $bpay_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PAYMENT_TYPES[3];
        });

        $card_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PAYMENT_MODES[1];
        });

        $direct_debit_records = $payments->filter(function($val) {
            return $val->type_key === PaymentHelpers::PAYMENT_MODES[0];
        });

        $cash_sum = $cash_records->sum('amount');
        $fpos_sum = $fpos_records->sum('amount');
        $cheque_sum = $cheque_records->sum('amount');
        $direct_deposit_sum = $direct_deposit_records->sum('amount');
        $bpay_sum = $bpay_records->sum('amount');
        $card_sum = $card_records->sum('amount');
        $direct_debit_sum = $direct_debit_records->sum('amount');
        $total_category = $cash_sum + $fpos_sum + $cheque_sum + $direct_deposit_sum + $bpay_sum + $card_sum + $direct_debit_sum;

        $list_data = [];
        $total_list = 0;

        foreach ($mapped_payments as $payment) {

            $obj = [
                'parent_name' => $payment->parent->fullName,
                'date' => $payment->date,
                'type' => 'item',
                'type_key' => $payment->type_key,
                'type_description' => $payment->type_description,
                'payment_reference' => $payment->payment_ref,
                'transaction_reference' => $payment->transaction_ref,
                'amount' => $payment->amount,
                'settlement_date' => $payment->settlement_date
            ];

            array_push($list_data, $obj);

            $total_list = $total_list + $payment->amount;
        }

        array_push($list_data, [
            'parent_name' => 'Total',
            'date' => '',
            'type' => 'total',
            'type_key' => '',
            'type_description' => '',
            'payment_reference' => '',
            'transaction_reference' => '',
            'amount' => $total_list,
            'settlement_date' => ''
        ]);
        
        return [
            'list' => $list_data,
            'totals' => [
                'cash' => $cash_sum,
                'fpos' => $fpos_sum,
                'cheque' => $cheque_sum,
                'direct_deposit' => $direct_deposit_sum,
                'bpay' => $bpay_sum,
                'direct_debit' => $direct_debit_sum,
                'card' => $card_sum,
                'total' => $total_category
            ]
        ];

    }

}
