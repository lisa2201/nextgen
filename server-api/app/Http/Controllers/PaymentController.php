<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Enums\RequestType;
use Kinderm8\Organization;
use Kinderm8\PaymentInformations;
use LocalizationHelper;
use PaymentHelpers;
use RequestHelper;
use Artisaninweb\SoapWrapper\SoapWrapper;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Kinderm8\Http\Resources\PaymentInformationsResource;
use Kinderm8\Http\Resources\PaymentInformationsResourceCollection;
use Kinderm8\Invoice;
use Kinderm8\PaymentHistory;
use Stripe\Charge;
use Stripe\Customer;
use Stripe\Stripe;

class PaymentController extends Controller
{
    private $soapWrapper;

    public function __construct(SoapWrapper $soapWrapper)
    {
        $this->soapWrapper = $soapWrapper;
    }

    /**
     * @param Request $request
     * @return mixed
     */
    public function getEzidebitId(Request $request)
    {
        try {

            $org_id = auth()->user()->organization->id;

            $org = Organization::find($org_id);

            if(!$org) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_400
                );

            }

            $ezidebit_id = null;


            $entries = PaymentInformations::where([['payment_type', '=', \PaymentHelpers::PAYMENT_TYPES[1]], ['organization_id', '=', $org_id]])
                ->orderBy('ref_id', 'desc')->get();

            // $ezidebit_id = PaymentHelpers::generateEzidebitId(Helpers::hxCode($org_id), count($entries), count($entries) > 0 ? $entries[0]->ref_id : null);

            $ezidebit_id = PaymentHelpers::generateParentEzidebitId();

            $eddr_url = PaymentHelpers::getPaymentConfig('EDDR_URL', 'EZIDEBIT');

            $public_key = $org->country_code === PaymentHelpers::COUNTRY_CODE[0] ? PaymentHelpers::getPaymentConfig('EZIDEBIT_PUBLIC_KEY', 'EZIDEBIT') : PaymentHelpers::getPaymentConfig('STRIPE_PUBLIC_KEY', 'STRIPE');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'reference' => $ezidebit_id,
                        'eddr_url' => $eddr_url,
                        'public_key' => $public_key
                    ]
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    /**
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function completePayment(Request $request)
    {
        DB::beginTransaction();

        try
        {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'firstname' => ['required_if:orgcontact,false'],
                'lastname' => ['required_if:orgcontact,false'],
                'country' => ['required_if:orgcontact,false'],
                'phone' => ['required_if:orgcontact,false'],
                'address1' => ['required_if:orgcontact,false'],
                'zip' => ['required_if:orgcontact,false'],
                'state' => ['required_if:orgcontact,false'],
                'city' => ['required_if:orgcontact,false'],
                'reference' => ['required']
            ]);

            $org_id = auth()->user()->organization->id;

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            /*-----------------------------------------------------------*/
            /* Create payment method record */
            /*-----------------------------------------------------------*/

            $organization = Organization::find($org_id);
            $org_user = $organization->user;

            $reference = $request->input('reference');

            $paymentType = $organization->country_code === PaymentHelpers::COUNTRY_CODE[0] ? PaymentHelpers::PAYMENT_TYPES[1] : PaymentHelpers::PAYMENT_TYPES[0];

            // Deactivate other methods for the org
            PaymentInformations::where('organization_id', auth()->user()->organization_id)->where('status', '0')->update(['status' => '1']);

            // Update Payment Information
            $payment = new PaymentInformations;
            $payment->organization_id = $organization->id;
            $payment->payment_type = $paymentType;

            $useOrgContact = $request->input('orgcontact') ? true : false;

            $payment->first_name = $useOrgContact ? $org_user->first_name : $request->input('firstname');
            $payment->last_name = $useOrgContact ? $org_user->last_name :  $request->input('lastname');
            $payment->phone = $useOrgContact ? $organization->phone_number : $request->input('phone');
            $payment->address1 = $useOrgContact ? $organization->address_1 : $request->input('address1');
            $payment->address2 = $useOrgContact ? $organization->address_2 : ($request->input('address2') ? $request->input('address2') : null);
            $payment->zip_code = $useOrgContact ? $organization->zip_code : $request->input('zip');
            $payment->city = $useOrgContact ? $organization->city : $request->input('city');
            $payment->country_code = $useOrgContact ? $organization->country_code : $request->input('country');
            $payment->state = $useOrgContact ? $organization->state : $request->input('state');

            if($paymentType === PaymentHelpers::PAYMENT_TYPES[0])
            {
                // Stripe
                $stripeData = $this->stripeCustomerRegister($reference, $organization);
                $payment->properties = $stripeData['properties'];
                $payment->ref_id = $stripeData['customerref'];
                $payment->last4 = $stripeData['last4'];
                $payment->exp_month = (int) $stripeData['exp_month'];
                $payment->exp_year =(int) $stripeData['exp_year'];
                $payment->mode = $stripeData['mode'];

            }
            else if($paymentType == PaymentHelpers::PAYMENT_TYPES[1])
            {
                // Ezidebit
                $ezidebitData = $this->ezidebitCustomerRegister($reference, $organization);
                $payment->properties = $ezidebitData['properties'];
                $payment->ref_id = $ezidebitData['customerref'];
                $payment->last4 = $ezidebitData['last4'];
                $payment->mode = $ezidebitData['mode'];

                if($ezidebitData['mode'] === PaymentHelpers::PAYMENT_MODES[1]) {
                    $payment->exp_month = (int) $ezidebitData['exp_month'];
                    $payment->exp_year = (int) $ezidebitData['exp_year'];
                }
            }

            $payment->status = '0';
            $payment->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new PaymentInformationsResource($payment)
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            $code = $e->getCode();
            $message = LocalizationHelper::getTranslatedText('system.internal_error');

            if($e->getCode() !== 0)
            {
                $message = LocalizationHelper::getTranslatedText('payment.' . $code);
            }

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, $message
            ), RequestType::CODE_500);
        }
    }

    /**
     * @param Request $request
     * @return array
     * @throws Exception
     */
    public function stripeCustomerRegister($token, Organization $org)
    {

        try
        {
            Stripe::setApiKey(PaymentHelpers::getPaymentConfig('STRIPE_PRIVATE_KEY', 'STRIPE'));

            if(empty($token))
            {
                throw new Exception('Stripe Token Undefined', 1001);
            }

            $customer = Customer::create([
                "email" => $org->email,
                "metadata" => [
                    "organization" => $org->company_name,
                ]
            ]);

            $card = $customer->sources->create([
                "source" => $token
            ]);

            $property_data = [
                "properties" => [
                    "cardref" => $card->id,
                    "name" => $card->name
                ],
                "customerref" => $customer->id,
                "last4" => $card->last4,
                "exp_month" => $card->exp_month,
                "exp_year" => $card->exp_year,
                "mode" => PaymentHelpers::PAYMENT_MODES[1]
            ];

            return $property_data;
        }
        catch(\Stripe\Error\Card $e)
        {
            // Since it's a decline, \Stripe\Error\Card will be caught
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1002);
        }
        catch (\Stripe\Error\RateLimit $e)
        {
            // Too many requests made to the API too quickly
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1003);
        }
        catch (\Stripe\Error\InvalidRequest $e)
        {
            // Invalid parameters were supplied to Stripe's API
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e),1004);
        }
        catch (\Stripe\Error\Authentication $e)
        {
            ErrorHandler::log($e);

            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e),1005);
        }
        catch (\Stripe\Error\ApiConnection $e)
        {
            // Network communication with Stripe failed
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e),1006);
        }
        catch (\Stripe\Error\Base $e)
        {
            // Display a very generic error to the user, and maybe send
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e));
        }
        catch (Exception $e)
        {
            if(isset($customer))
            {
                $customer->delete();
            }

            throw new Exception($e);
        }

    }

    /**
     * @return array
     * @throws Exception
     */
    public function ezidebitCustomerRegister($reference, Organization $org)
    {
        try
        {
            $org_id = $org->id;
            $index = $org->index;

            $ezidebit_entries = PaymentInformations::where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[1])
                ->where('organization_id', '=', $org_id)
                ->orderBy('ref_id','desc')->get();

            if(empty($reference))
            {
                $reference = PaymentHelpers::generateEzidebitId($index, count($ezidebit_entries), count($ezidebit_entries) > 0 ? $ezidebit_entries[0]->ref_id : null);
            }

            $this->soapWrapper->add('Ezidebit', function ($service) {
                $service
                    ->wsdl(PaymentHelpers::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $soapResponse = $this->soapWrapper->call('Ezidebit.GetCustomerDetails', [
                "GetCustomerDetails" => [
                    "DigitalKey" => PaymentHelpers::getPaymentConfig('EZIDEBIT_DIGITAL_KEY', 'EZIDEBIT'),
                    "YourSystemReference" => $reference
                ]
            ]);

            if($soapResponse->GetCustomerDetailsResult->Error !== 0)
            {
                throw new Exception($soapResponse->GetCustomerDetailsResult->ErrorMessage, $soapResponse->GetCustomerDetailsResult->Error);
            }

            $this->soapWrapper->add('EzidebitPci', function ($service) {
                $service
                    ->wsdl(PaymentHelpers::getPaymentConfig('PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $paymentInfo = $this->soapWrapper->call('EzidebitPci.GetCustomerAccountDetails', [
                "GetCustomerAccountDetails" => [
                    "DigitalKey" => PaymentHelpers::getPaymentConfig('EZIDEBIT_DIGITAL_KEY', 'EZIDEBIT'),
                    "YourSystemReference" => $reference
                ]
            ]);

            if($paymentInfo->GetCustomerAccountDetailsResult->Error !== 0)
            {
                throw new Exception($paymentInfo->GetCustomerAccountDetailsResult->ErrorMessage, $paymentInfo->GetCustomerAccountDetailsResult->Error);
            }

            $customer = $soapResponse->GetCustomerDetailsResult->Data;
            $paymentDetails = $paymentInfo->GetCustomerAccountDetailsResult->Data;

            $mode = trim($paymentDetails->AccountNumber) !== '' ? PaymentHelpers::PAYMENT_MODES[0] : PaymentHelpers::PAYMENT_MODES[1];

            $property_data = [
                "properties" => [
                    "customerid" => $customer->EzidebitCustomerID
                ],
                "customerref" => $reference,
                "mode" => $mode
            ];

            if($mode === PaymentHelpers::PAYMENT_MODES[1]) {
                $property_data['last4'] = substr($paymentDetails->CreditCardNumber, -4);
                $property_data['exp_month'] = $paymentDetails->ExpiryMonth;
                $property_data['exp_year'] = $paymentDetails->ExpiryYear;
                $property_data['properties']['name'] = $paymentDetails->CardHolderName;
            } else {
                $property_data['last4'] = substr($paymentDetails->AccountNumber, -4);
                $property_data['properties']['name'] = $paymentDetails->AccountHolderName;
            }

            return $property_data;

        }
        catch(Exception $e)
        {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public function listPaymentMethods(Request $request)
    {

        $paymentInformationList = [];

        try {

            if (auth()->user()->hasOwnerAccess()) {
                $paymentInformationList = PaymentInformations::where('organization_id', '=', auth()->user()->organization_id)->orderBy('id', 'asc')->get();
            } else {
                $paymentInformationList = null;
            }

        } catch (Exception $e) {
            ErrorHandler::log($e);
        }

        return (new PaymentInformationsResourceCollection($paymentInformationList))
            ->response()
            ->setStatusCode(RequestType::CODE_200);

    }

    public function deletePaymentMethod(Request $request)
    {

        DB::beginTransaction();

        try {

            $id = Helpers::decodeHashedID($request->input('id'));

            $paymentMethod = PaymentInformations::find($id);

            if (is_null($paymentMethod)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            if($paymentMethod->status === '0') {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('payment.delete_active_payment_method')
                    ),
                    RequestType::CODE_404
                );
            }

            $paymentMethod->delete();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );
        } catch (\Exception $e) {
            DB::rollBack();

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

    public function setDefaultPaymentMethod(Request $request)
    {
        DB::beginTransaction();

        try {

            $id = Helpers::decodeHashedID($request->input('id'));

            $paymentMethod = PaymentInformations::find($id);

            if(is_null($paymentMethod)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $paymentMethod->status = '0';
            $paymentMethod->save();

            PaymentInformations::where('organization_id', '=', auth()->user()->organization_id)
                ->where('id', '!=', $id)
                ->update(['status' => '1']);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {
            DB::rollBack();

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

    public function manualPayment(Request $request)
    {

        DB::beginTransaction();

        try {

            $id = Helpers::decodeHashedID($request->input('id'));

            $invoice = Invoice::find($id);

            if (is_null($invoice)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $org = Organization::find(auth()->user()->organization_id);

            $payment_method = PaymentInformations::where('status', '0')->where('organization_id', $org->id)->get()->first();

            if(empty($payment_method)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('payment.payment_method_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $amount = $invoice->subtotal;

            if($org->tax_percentage != null) {
                $amount = $amount + (($amount/100) * $org->tax_percentage);
            }

            $payment_ref = Carbon::now()->unix();
            $transaction_ref = null;
            $response = null;
            $status = 'failed';
            $success = false;

            $newPaymentHistory = new PaymentHistory();
            $newPaymentHistory->organization_id = $org->id;
            $newPaymentHistory->invoice_id = $invoice->id;
            $newPaymentHistory->payment_method_id = $payment_method->id;
            $newPaymentHistory->amount = $amount;
            $newPaymentHistory->date = Carbon::now()->format('Y-m-d');
            $newPaymentHistory->payment_type = 'manual';

            if($payment_method->payment_type == 'manual') {

                $status = 'paid';

            } elseif($payment_method->payment_type == 'ezidebit') {

                try {

                    $this->soapWrapper->add('Ezidebit', function ($service) {
                        $service
                            ->wsdl(PaymentHelpers::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                            ->trace(true);
                    });

                    $soapResponse = $this->soapWrapper->call('Ezidebit.AddPaymentUnique', [
                        "AddPaymentUnique" => [
                            "DigitalKey" => PaymentHelpers::getPaymentConfig('EZIDEBIT_DIGITAL_KEY', 'EZIDEBIT'),
                            "YourSystemReference" => $payment_method->ref_id,
                            "DebitDate" => Carbon::now()->addDays(1)->format('Y-m-d'),
                            "PaymentAmountInCents" => $amount * 100,
                            "Username" => $org->company_name,
                            "PaymentReference" => $payment_ref
                        ]
                    ]);

                    if ($soapResponse->AddPaymentUniqueResult->Error === 0) {

                        $status = 'pending';
                        $success = true;
                        $response = $soapResponse->AddPaymentUniqueResult->Data;

                    } else {

                        $status = 'rejected_gateway';
                        $success = false;
                        $response = $soapResponse->AddPaymentUniqueResult->ErrorMessage;

                    }


                } catch (\Exception $e) {

                    ErrorHandler::log($e);
                    $status = 'failed';
                    $success = false;
                    $response = $e->getMessage();

                }

            } elseif($payment_method->payment_type == 'stripe') {

                try {

                    Stripe::setApiKey(PaymentHelpers::getPaymentConfig('STRIPE_PRIVATE_KEY', 'STRIPE'));

                    $stripeRes = Charge::create([
                        'amount' => $amount * 100, // Cents
                        'currency' => 'usd',
                        'customer' => $payment_method->ref_id
                    ]);

                    $status = 'paid';
                    $payment_ref = $stripeRes->id;
                    $transaction_ref = $stripeRes->balance_transaction;
                    $response = $stripeRes;


                } catch (\Exception $e) {

                    ErrorHandler::log($e);
                    $status = 'rejected_gateway';
                    $response = $e->getMessage();

                }

            }

            $newPaymentHistory->payment_ref = $payment_ref;
            $newPaymentHistory->transaction_ref = $transaction_ref;
            $newPaymentHistory->status = $status;
            $newPaymentHistory->properties = json_encode([
                "response" => $response
            ]);
            $newPaymentHistory->save();

            $invoice->last_attempted_date = Carbon::now()->format('Y-m-d');
            $invoice->attempt_count = $invoice->attempt_count ? $invoice->attempt_count + 1 : 1;
            $invoice->status = $status;

            $invoice->save();


            DB::commit();

            $message = $status === 'failed' || $status === 'rejected_gateway' ? LocalizationHelper::getTranslatedText('payment.invoice_paid_fail') : LocalizationHelper::getTranslatedText('payment.invoice_paid_success');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    $message,
                    [
                        'success' => $status == 'failed' || $status === 'rejected_gateway' ? false : true
                    ]
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {
            DB::rollBack();

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
