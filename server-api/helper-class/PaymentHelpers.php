<?php

use Artisaninweb\SoapWrapper\SoapWrapper;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\User;
use Illuminate\Support\Str;
use Kinderm8\Enums\StatusType;
use Kinderm8\Invoice;
use Kinderm8\Organization;
use Kinderm8\ParentPaymentProvider;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\PaymentHistory;
use Kinderm8\PaymentInformations;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\ParentPaymentProvider\IParentPaymentProviderRepository;
use Ramsey\Uuid\Uuid;
use Stripe\Charge;
use Stripe\Customer;
use Stripe\Stripe;
use Stripe\Error\Card;
use Stripe\Error\RateLimit;
use Stripe\Error\InvalidRequest;
use Stripe\Error\Authentication;
use Stripe\Error\ApiConnection;
use Stripe\Error\Base;

class PaymentHelpers
{
    const PAYMENT_TYPES = [
        'stripe',
        'ezidebit',
        'manual',
        'bpay'
    ];

    const PAYMENT_PROPERTIES = [
        'customerid',
        'cardref',
        'name',
        'billercode'
    ];

    const PAYMENT_HISTORY_PROPERTIES = [
        'payment_instrument'
    ];

    const PAYMENT_HISTORY_STATUS = [
        'incomplete',
        'completed',
        'failed',
        'pending',
        'submitted',
        'rejected_gateway',
        'paid'
    ];

    const INVOICE_STATUS = [
        'paid',
        'failed',
        'pending',
        'past_due',
        'scheduled'
    ];

    const COUNTRY_CODE = [
        'AU',
        'US'
    ];

    const CURRENCY_CODE = [
        'AUD',
        'USD'
    ];

    const TAX_PERCENTAGE = [
        'AU' => 10
    ];

    const PAYMENT_MODES = [
        'bank',
        'card'
    ];

    const PARENT_PAYMENT_STATUS = [
        'approved',
        'pending',
        'submitted',
        'completed',
        'rejected_gateway',
        'rejected_user',
        'refund_success',
        'refund_failed',
        'inactive'
    ];

    const PARENT_PAYMENT_EXECUTION_TYPE = [
        'auto',
        'manual'
    ];

    const PARENT_PAYMENT_GENERATION_TYPE = [
        'auto',
        'manual'
    ];

    const PARENT_PAYMENT_MANUAL_PAYMENT_TYPE = [
        'bpay',
        'cash',
        'cheque',
        'direct_debit',
        'configured_payment',
        'fpos',
        'direct_deposit'
    ];

    const PARENT_PAYMENT_TRANSACTION_TYPES = [
        'fee',
        'subsidy_payment',
        'parent_payment',
        'parent_payment_refund',
        'adjustment',
        'account_balance',
        'subsidy_estimate',
        'ccs_payment',
        'accs_payment'
    ];

    const PARENT_PAYMENT_TRANSACTION_MODE = [
        'credit',
        'debit'
    ];

    const ENTITLEMENT_CCS_TYPE = 'CCS';

    const ENTITLEMENT_ACCS_TYPE = 'ACCS';

    const PARENT_PAYMENT_PROVIDERS = [
        'stripe',
        'ezidebit'
    ];

    const CCS_PAYMENT_MAIN_TRANSACTION_MAP = [
        'Z401' => 'CCS Child Care Subsidy',
        'Z402' => 'ACCS Additional Child Care Subsidy',
        '4030' => 'Reversal',
        '0060' => 'Payment on Account',
        'ZRPY' => 'Debt Repayment',
        'ZMIG' => 'CCS Data Migration'
    ];

    const CCS_PAYMENT_SUB_TRANSACTION_MAP = [
        'D010' => 'CCS Debt Centre-Based DayCare',
        'D020' => 'CCS Debt Outside School Hours',
        'D030' => 'CCS Debt Family Day Care',
        'D040' => 'CCS Debt In Home Child Care',
        'D050' => 'CCS Business Continuity Debt',
        'D060' => 'CCS Debt One Off Manual',
        'D070' => 'CCS Returned Fee Reduction',
        'P010' => 'CCS Payt.Centre-Based Day Care',
        'P020' => 'CCS Payt. Outside School Hours',
        'P030' => 'CCS Payt. Family Day Care',
        'P040' => 'CCS Payt. In Home Child Care',
        'P050' => 'CCS Payt. Business Continuity',
        'P060' => 'CCS Payt. One Off Payment',
        'P070' => 'CCS Payt Returned from Service',
        'W010' => 'CCS Withholding',
        'X010' => 'CCS Dedn for Withholding',
        'X020' => 'CCS BCP Deductions',
        'X030' => 'Enrolment Advance Deductions',
        'X040' => 'Formal Debt Deductions',
        'X100' => 'CCS PRVDR Debt WHH Dedn',
        'X200' => 'CCS CUST Debt WHH Dedn',
        'Y010' => 'CCS Rev Distr. Withholding',
        'Y030' => 'CCS Rev Distr. Enrol. Advances',
        'Y040' => 'CCS Rev Distr. Formal Debts',
        'Y050' => 'Returned Fee Reduction',
        'Y100' => 'CCS PRVDR Debt WHH Applied',
        'Y200' => 'CCS CUST Debt WHH Applied'
    ];

    const ACCS_PAYMENT_SUB_TRANSACTION_MAP = [
        'D010' => 'ACCS Debt Child wellbeing  CDC',
        'D011' => 'ACCS Debt GrandParent CDC',
        'D012' => 'ACCS Debt Temp Hardship CDC',
        'D013' => 'ACCS Debt Trans to work CDC',
        'D020' => 'ACCS Debt Child wellbeing OSH',
        'D021' => 'ACCS Debt GrandParent OSH',
        'D022' => 'ACCS Debt Temp Hardship OSH',
        'D023' => 'ACCS Debt Trans to work OSH',
        'D030' => 'ACCS Debt Child wellbeing  FDC',
        'D031' => 'ACCS Debt Grandparent   FDC',
        'D032' => 'ACCS Debt Temp Hardship FDC',
        'D033' => 'ACCS Debt Trans to work FDC',
        'D040' => 'ACCS Debt Child wellbeing HBE',
        'D041' => 'ACCS Debt Grandparent  HBE',
        'D042' => 'ACCS Debt Temp Hardship HBE',
        'D043' => 'ACCS Debt Trans to work HBE',
        'D050' => 'ACCS Debt Business Continuity',
        'D060' => 'ACCS Debt One Off Manual',
        'P010' => 'ACCS- Payt Child Wellbeing CDC',
        'P011' => 'ACCS- Payt. Grandparent(CDC)',
        'P012' => 'ACCS- Payt. TempHardship(CDC)',
        'P013' => 'ACCS- Payt. Trans.ToWork(CDC)',
        'P020' => 'ACCS- Payt Child Wellbeing OSH',
        'P021' => 'ACCS- Payt. Grandparent(OSH)',
        'P022' => 'ACCS- Payt. TempHardship(OSH)',
        'P023' => 'ACCS- Payt. Trans.ToWork(OSH)',
        'P030' => 'ACCS- Payt Child Wellbeing FDC',
        'P031' => 'ACCS- Payt. Grandparent(FDC)',
        'P032' => 'ACCS- Payt. TempHardship(FDC)',
        'P033' => 'ACCS- Payt. Trans.ToWork(FDC)',
        'P040' => 'ACCS- Payt Child Wellbeing IHC',
        'P041' => 'ACCS- Payt. Grandparent(IHC)',
        'P042' => 'ACCS- Payt. TempHardship(IHC)',
        'P043' => 'ACCS- Payt. Trans.ToWork(IHC)',
        'P060' => 'ACCS- Payt. One Off Payment',
    ];

    const SUB_TRANSACTION_MAP = [
        '4030' => 'Reversal',
        '0100' => 'Payment on Account',
        'DM60' => 'Enrolment Advance Debt'
    ];

    const CCS_PAYMENT_GST_MAP = [
        'P0' => 'P0 - zero percent',
        'P1' => 'P1 - BUY Paid 10%',
        'P2' => 'P2 - BUY GST Free',
        'P3' => 'P3 - Buy Input Taxed Supplies',
        'P5' => 'P5 - BUY Out of Scope or No GST',
        'P6' => 'P6 - BUY Not paid in price',
        'P8' => 'P8 - BUY Imported Supplies',
    ];

    const CENTER_BASED_CARE_HOURLY_CAP = 12.31;
    const OUTSIDE_SCHOOL_CARE_HOURLY_CAP = 10.77;
    const PAYMENT_WAIVE_ADJUSTMENT_ITEM_NAME = 'Waived Gap Fee';

    public static function attachPlanDetailsOnly(Organization $org, $prop)
    {
        $prop['payment_info'] = [];

        if(isset($org->toArray()['current_plan']))
        {
            $prop['payment_info']['plan'] = array_only($org->toArray()['current_plan'], ['index', 'name', 'css_style']);
        }
        else
        {
            $prop['payment_info']['plan'] = array_only($org->current_plan->toArray(), ['index', 'name', 'css_style']);
        }

        return $prop;
    }

    /*
     * For Invoice
     */
    public static function attachPlanWithPrice(Organization $org, $prop)
    {
        $prop['payment_info'] = [];

        if(isset($org->toArray()['current_plan']))
        {
            $prop['payment_info']['plan'] = array_only($org->toArray()['current_plan'], ['index', 'name', 'base_price', 'properties']);
        }
        else
        {
            $prop['payment_info']['plan'] = array_only($org->current_plan->toArray(), ['index', 'name',  'base_price', 'properties']);
        }

        return $prop;
    }

    /*
     * root
     */
    public static function attachPaymentDetailsForRoot(Organization $org, $prop)
    {
        $prop['payment_info'] = [
            'expired_account' => $org->subscription_expired,
            // need to hide
            'trial_end' => ($org->trial_end_date != null) ? $org->trial_end_date->toDateString() : null,
            'subscription_on' =>  ($org->subscription_start_date != null) ?  $org->subscription_start_date->toDateString() : null,
            'status' => $org->payment_status
        ];

        if(isset($org->toArray()['current_plan']))
        {
            $prop['payment_info']['plan'] = array_only($org->toArray()['current_plan'], ['index', 'name', 'css_style']);
        }
        else
        {
            $prop['payment_info']['plan'] = array_only($org->current_plan->toArray(), ['index', 'name', 'css_style']);
        }

        /* set payment type */
        $ptype = $org->payment_data;
        if($ptype != null && count($ptype) > 0)
        {
            if($ptype[0]->payment_type == static::PAYMENT_TYPES[0])
            {
                $prop['payment_info']['ptype'] = 'card';
            }
            else if($ptype[0]->payment_type == static::PAYMENT_TYPES[1])
            {
                $prop['payment_info']['ptype'] = 'bank';
            }
            else
            {
                $prop['payment_info']['ptype'] = 'cash';
            }
        }
        else
        {
            $prop['payment_info']['ptype'] = 'none';
        }

        /*if (array_search($prop['payment_info']['plan']['name'], [config('subscripton.plans.P2'), config('subscripton.plans.P3')]) > -1
            && $org->payment_data->count() == 0 && $org->payment_status == \StatusHelper::PAY_TRIAL)
        {
            $prop['payment_info']['has_payment_profile'] = false;
        }
        else
        {
            $prop['payment_info']['has_payment_profile'] = true;
        }*/

        return $prop;
    }

    /*
     * site manager
     */
    public static function attachPaymentDetailsForOwner(Organization $org, $prop)
    {
        $prop['payment_info'] = [
            'account_active' => true
            //'expired_account' => $org->subscription_expired,
            // need to hide
            //'trial_end' => ($org->trial_end_date != null) ? $org->trial_end_date->toDateString() : null,
            //'subscription_on' =>  ($org->subscription_start_date != null) ?  $org->subscription_start_date->toDateString() : null,
            //'status' => $org->payment_status
        ];

        if(isset($org->toArray()['current_plan']))
        {
            $prop['payment_info']['plan'] = array_only($org->toArray()['current_plan'], ['index', 'name']);
        }
        else
        {
            $prop['payment_info']['plan'] = array_only($org->current_plan->toArray(), ['index', 'name']);
        }

        /* payment check */
        if (array_search($prop['payment_info']['plan']['name'], [config('subscripton.plans.P2'), config('subscripton.plans.P3')]) > -1)
        {
            /* has payments */
            if($org->payment_data->count() == 0)
            {
                $prop['payment_info']['has_payment_profile'] = false;
                $prop['payment_info']['account_active'] = false;
            }
            /* check if payment failed */
            else if($org->payment_data->count() > 0 && $org->payment_status == StatusType::PAY_FAILED)
            {
                /* grace period end date passed */
                if($org->isGracePeriodExpired())
                {
                    $prop['payment_info']['has_payment_profile'] = false;
                }
                else
                {
                    $prop['payment_info']['has_payment_profile'] = true;
                    $prop['payment_info']['grace_period_left'] = $org->getAvailableGracePeriod();
                    $prop['payment_info']['grace_period_end'] = ($org->grace_period_end_date != null) ? $org->grace_period_end_date->toDateString() : null;
                }
            }
            else
            {
                $prop['payment_info']['has_payment_profile'] = true;
            }
        }
        /* free subscripton */
        else
        {
            $prop['payment_info']['has_payment_profile'] = true;
        }

        return $prop;
    }

    /**
     * Stripe error message handler
     * @param Error
     * @return {Message}
     */
    public static function getStripeError($error)
    {
        $body = $error->getJsonBody();
        $err  = $body['error'];
        $message = $err['message'];
        return $message;
    }

    /**
     * @param $code
     * @param $message
     * @return array
     */
    public static function genErrObj($code, $message)
    {
        return ['code' => (string)$code, 'message' => $message];
    }

    /**
     * @param $index
     * @param $count
     * @param $ref_id
     * @return string
     */
    public static function generateEzidebitId($index,$count,$ref_id)
    {
        if($count === 0)
        {
            return $index . "_" . 1;
        }
        else
        {
            $last_ref = explode('_',$ref_id);
            $last_num = (int) end($last_ref);
            return $index . "_" . ($last_num + 1);
        }
    }

    /**
     * @param $index
     * @param $count
     * @param $ref_id
     * @return string
     */
    public static function generateParentEzidebitId()
    {
        return Str::uuid();
    }

    /**
     * @param $info
     * @throws Exception
     */
    public static function changeStripeDefault($info)
    {
        try
        {
            $properties = $info->properties;

            Stripe::setApiKey(self::getPaymentConfig('STRIPE_PRIVATE_KEY', 'STRIPE'));

            $customer = Customer::retrieve($info->ref_id);

            $customer->default_source = $properties[static::PAYMENT_PROPERTIES[5]];

            $customer->save();

            return;
        }
        catch(Card $e)
        {
            // Since it's a decline, \Stripe\Error\Card will be caught
            throw new Exception(static::getStripeError($e),1002);
        }
        catch (RateLimit $e)
        {
            // Too many requests made to the API too quickly
            throw new Exception(static::getStripeError($e), 1003);
        }
        catch (InvalidRequest $e)
        {
            // Invalid parameters were supplied to Stripe's API
            throw new Exception(static::getStripeError($e),1004);
        }
        catch (Authentication $e)
        {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            throw new Exception(static::getStripeError($e),1005);
        }
        catch (ApiConnection $e)
        {
            // Network communication with Stripe failed
            throw new Exception(static::getStripeError($e),1006);
        }
        catch (Base $e)
        {
            // Display a very generic error to the user, and maybe send
            throw new Exception(static::getStripeError($e));
        }
        catch (Exception $e)
        {
            throw new Exception($e);
        }
    }

    /**
     * @param $customerid
     * @param $amount
     * @return string
     * @throws Exception
     */
    public static function stripePayment($customerid,$amount)
    {
        try
        {
            Stripe::setApiKey(self::getPaymentConfig('STRIPE_PRIVATE_KEY', 'STRIPE'));

            $customer = Customer::retrieve($customerid);
            $payment = Charge::create([
                "amount" => $amount * 100,
                "currency" => "usd",
                "customer" => $customer->id
            ]);

            return $payment->id;
        }
        catch(Card $e)
        {
            // Since it's a decline, \Stripe\Error\Card will be caught
            throw new Exception(static::getStripeError($e),1002);
        }
        catch (RateLimit $e)
        {
            // Too many requests made to the API too quickly
            throw new Exception(static::getStripeError($e), 1003);
        }
        catch (InvalidRequest $e)
        {
            // Invalid parameters were supplied to Stripe's API
            throw new Exception(static::getStripeError($e),1004);
        }
        catch (Authentication $e)
        {
            Log::error($e);
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            throw new Exception(static::getStripeError($e),1005);
        }
        catch (ApiConnection $e)
        {
            // Network communication with Stripe failed
            throw new Exception(static::getStripeError($e),1006);
        }
        catch (Base $e)
        {
            // Display a very generic error to the user, and maybe send
            throw new Exception(static::getStripeError($e));
        }
        catch (Exception $e)
        {
            throw new Exception($e);
        }
    }

    /**
     * @param $customerid
     * @param $amount
     * @return string
     * @throws Exception
     */
    public static function ezidebitPayment($customerid,$amount)
    {
        try
        {
            if(!isset($customerid))
            {
                throw new Exception('Ezidebit reference undefined', 1000);
            }

            $reference = Helpers::generateSerialCode();

            $soap = new SoapWrapper();

            $soap->add('Ezidebit', function ($service) {
                $service
                    ->wsdl(self::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $soapResponse = $soap->call('Ezidebit.AddPayment', [
                "AddPayment" => [
                    "DigitalKey" => self::getPaymentConfig('EZIDEBIT_DIGITAL_KEY', 'EZIDEBIT'),
                    "YourSystemReference" => $customerid,
                    "DebitDate" => Carbon::tomorrow()->format('Y-m-d'),
                    "PaymentAmountInCents" => $amount * 100,
                    "PaymentReference" => $reference
                ]
            ]);

            if($soapResponse->AddPaymentResult->Error !== 0)
            {
                throw new Exception($soapResponse->AddPaymentResult->ErrorMessage, $soapResponse->AddPaymentResult->Error);
            }

            return $reference;
        }
        catch(Exception $e)
        {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    /**
     * @param $id
     */
    public static function paymentFailHandler($id)
    {
        try
        {
            $invoice = Invoice::findorFail($id);
            $invoice->status = static::INVOICE_STATUS[1];
            $invoice->save();

            $existing_history = PaymentHistory::where('invoice_id','=',$id)->first();
            $payment_info = auth()->user()->organization->payment_data->first();
            $last_payment_ref = PaymentHistory::max('sequence_number') ? PaymentHistory::max('sequence_number') : 0;

            $history = new PaymentHistory();
            $history->organization_id = auth()->user()->organization->id;
            $history->invoice_id = $id;
            $history->amount = $invoice->subtotal;
            $history->date = Carbon::now();
            $history->payment_method = $payment_info->payment_type;
            $history->status = static::PAYMENT_HISTORY_STATUS[2];

            if($existing_history)
            {
                $history->payment_ref = $existing_history->payment_ref;
                $history->sequence_number = $existing_history->sequence_number;
                $history->transaction_ref = '1223';
            }
            else
                {
                $history->payment_ref = 'PAY-'. ($last_payment_ref + 1);
                $history->sequence_number = $last_payment_ref + 1;
                $history->transaction_ref = '2332';
            }

            if($payment_info->payment_type == static::PAYMENT_TYPES[0])
            {
                //credit card
                $history->properties = json_encode(['payment_instrument' => $payment_info->properties[static::PAYMENT_PROPERTIES[2]]]);
            }
            else if($payment_info->payment_type == static::PAYMENT_TYPES[1])
            {
                //ezidebit
                $history->properties = json_encode(['payment_instrument' => $payment_info->properties[static::PAYMENT_PROPERTIES[1]]]);
            }

            $history->save();

            return;
        }
        catch(Exception $e)
        {
            Log::error($e);
        }
    }

    public static function getPaymentConfig(string $name, string $option): string
    {
        $key = strtoupper($option) . (app()->environment('production') ? '' : '_DEV');
        $sub_key = strtoupper($name);

        return config(trim("payment.${key}.${sub_key}"));
    }

    public static function generatePaymentReference()
    {
        return Uuid::uuid4();
    }

    public static function getRunningTotal($parenId, $getCurrentTotal, $amount, $action)
    {

        $last_transaction = ParentPaymentTransaction::where('parent_id', '=', $parenId)->orderBy('id', 'desc')->first();

        if(is_null($last_transaction))
        {

            if($getCurrentTotal == true)
            {
                return 0;
            }
            else
            {
                return self::calculateRunningTotal(0, $amount, $action);
            }

        }
        else
        {
            if($getCurrentTotal == true)
            {
                return $last_transaction->running_total;
            }
            else
            {
                return self::calculateRunningTotal($last_transaction->running_total, $amount, $action);
            }
        }

    }

    public static function calculateRunningTotal($last_total, $amount, $action)
    {

        $new_total = $last_total;

        if($action == self::PARENT_PAYMENT_TRANSACTION_MODE[0])
        {
            // Credit
            $new_total = $last_total - $amount;
        }
        elseif($action == self::PARENT_PAYMENT_TRANSACTION_MODE[1])
        {
            // Debit
            $new_total = $last_total + $amount;
        }

        return $new_total;
    }

    public static function validUserAddress(User $user)
    {
        $properties_to_check = [
            'address_1',
            'city',
            'state',
            'country_code',
            'zip_code',
            'country_code',
            'phone'
        ];

        $valid = true;

        foreach ($properties_to_check as $prop)
        {
            if(empty($user->$prop))
            {
                $valid = false;
            }
        }

        return $valid;

    }

    public static function getProviderKeyPair(ParentPaymentProvider $provider)
    {

        $key_pair = [
            'public_key' => null,
            'private_key' => null
        ];

        if ($provider['payment_type'] === self::PARENT_PAYMENT_PROVIDERS[0]) {
            // Stripe

            $pu_index = array_search('public_key', array_column($provider->configurations, 'name'));
            $pr_index = array_search('secret_key', array_column($provider->configurations, 'name'));

            $key_pair['public_key'] = $provider->configurations[$pu_index]['value'];
            $key_pair['private_key'] = $provider->configurations[$pr_index]['value'];

        } else if ($provider['payment_type'] === self::PARENT_PAYMENT_PROVIDERS[1]) {
            // Ezidebit

            $pu_index = array_search('public_key', array_column($provider->configurations, 'name'));
            $pr_index = array_search('digital_key', array_column($provider->configurations, 'name'));

            $key_pair['public_key'] = $provider->configurations[$pu_index]['value'];
            $key_pair['private_key'] = $provider->configurations[$pr_index]['value'];
        }


        return $key_pair;

    }

    public static function getTransactionModeTotals($transactions)
    {

        $credit_total = 0;
        $debit_total = 0;

        $credit_transactions = $transactions->filter(function($value) {
            return $value['mode'] === self::PARENT_PAYMENT_TRANSACTION_MODE[0];
        });

        $debit_transactions = $transactions->filter(function($value) {
            return $value['mode'] === self::PARENT_PAYMENT_TRANSACTION_MODE[1];
        });

        $credit_total = array_sum(array_column($credit_transactions->toArray(), 'amount'));
        $debit_total = array_sum(array_column($debit_transactions->toArray(), 'amount'));

        return [
            'credit_total' => $credit_total,
            'debit_total' => $debit_total
        ];

    }

    public static function recalculateTransaction($transactions, $opening_balance)
    {

        $current_balance = $opening_balance ? $opening_balance : 0;

        $recalculated = $transactions->map(function ($transaction, $index) use(&$current_balance) {

            $running = 0;

            if ($transaction['transaction_type'] === 'account_balance') {
                $current_balance = 0;
            }

            if ($transaction['mode'] === self::PARENT_PAYMENT_TRANSACTION_MODE[0]) {
                $running = $current_balance - $transaction['amount'];
            } else {
                $running = $current_balance + $transaction['amount'];
            }

            $current_balance = $running;
            $transaction['running_total'] = $running;
            $transaction['index_key'] = $index;

            return $transaction;

        });

        return $recalculated;

    }

    public static function filterTransactionDates($transactions, string $start_date, string $end_date)
    {

        $start_date_obj = Carbon::createFromFormat('Y-m-d', $start_date);
        $end_date_obj = Carbon::createFromFormat('Y-m-d', $end_date);

        $filtered = $transactions->filter(function ($value, $key) use($start_date_obj, $end_date_obj) {
            return Carbon::createFromFormat('Y-m-d', $value['date'])->between($start_date_obj, $end_date_obj, true);
        });

        return $filtered;

    }

    public static function generateBpayReference(User $user)
    {
        // branch_id + user_id + random_number
        $random_num = rand(1, 9);
        return $user->branch_id . $user->id . $random_num;
    }

    public static function calculateBookingFee($booking)
    {

        $fee = 0;
        
        if ($booking['fee']) {
            
            if ($booking['fee']['frequency'] === '0') {
                $fee = $booking['fee_amount'];
            } else {
                $hours = (($booking['session_end'] - $booking['session_start']) / 60);
                $fee = $booking['fee_amount'] * $hours;
            }
            
        }
        
        return $fee;
    }

    public static function parentPaymentProviderFull($org_id, $request) {

        $branch = app(IBranchRepository::class)->findByOrg($org_id, [], false);
        $providers = app(IParentPaymentProviderRepository::class)->get(['org' => $org_id], [], $request, false);

        return count($providers) >= count($branch);
    }
}
