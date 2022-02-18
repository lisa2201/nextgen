<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\PaymentInformationsResource;
use LocalizationHelper;
use PaymentHelpers;
use RequestHelper;
use Artisaninweb\SoapWrapper\SoapWrapper;
use Aws\Credentials\Credentials;
use Aws\Lambda\LambdaClient;
use DBHelper;
use Faker\Provider\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Kinderm8\Http\Resources\ParentPaymentMethodResource;
use Kinderm8\Http\Resources\ParentPaymentMethodResourceCollection;
use Kinderm8\Http\Resources\ParentPaymentResource;
use Kinderm8\Http\Resources\ParentPaymentResourceCollection;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Notifications\OnSendParentEzidebitLink;
use Kinderm8\ParentPayment;
use Kinderm8\ParentPaymentMethod;
use Kinderm8\ParentPaymentProvider;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use Log;
use Stripe\Charge;
use Stripe\Customer;
use Stripe\Stripe;

class ParentPaymentController extends Controller
{
    use UserAccessibility;
    private $soapWrapper;

    public function __construct(SoapWrapper $soapWrapper)
    {
        $this->soapWrapper = $soapWrapper;
    }

    public function storePaymentMethod(Request $request)
    {
        DB::beginTransaction();

        try {

            $require_user_id = false;

            if(auth()->user()->isBranchUser()) {
                $require_user_id = true;
            }

            $validator = Validator::make($request->all(), [
                'firstname' => ['required_if:profilecontact,false'],
                'lastname' => ['required_if:profilecontact,false'],
                'country' => ['required_if:profilecontact,false'],
                'phone' => ['required_if:profilecontact,false'],
                'address1' => ['required_if:profilecontact,false'],
                'zip' => ['required_if:profilecontact,false'],
                'state' => ['required_if:profilecontact,false'],
                'city' => ['required_if:profilecontact,false'],
                'reference' => ['required'],
                'user_id' => Rule::requiredIf($require_user_id)
            ]);

            $org_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            if($require_user_id) {
                // Branch operation
                $user = User::findOrFail(Helpers::decodeHashedID($request->input('user_id')));
            } else {
                // Parent Operation
                $user = auth()->user();
            }

            /*-----------------------------------------------------------*/
            /* Create payment method record */
            /*-----------------------------------------------------------*/

            $reference = $request->get('reference');

            $provider = ParentPaymentProvider::where('organization_id', $org_id)
                ->where('branch_id', $branch_id)
                ->where('status', '0')
                ->get()
                ->first();

            if(!$provider) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('payment.parent_payment_providers_missing')
                    ),
                    RequestType::CODE_400
                );

            }

            $paymentType = $provider->payment_type;

            $private_key = PaymentHelpers::getProviderKeyPair($provider)['private_key'];

            // Deactivate other methods for the org
            ParentPaymentMethod::where('user_id', $user->id)
                ->where('status', '0')
                ->where('organization_id', $org_id)
                ->where('branch_id', $branch_id)
                ->update(['status' => '1']);

            // Update Payment Information

            $payment = new ParentPaymentMethod();
            $payment->organization_id = $org_id;
            $payment->branch_id = $branch_id;
            $payment->user_id = $user->id;
            $payment->payment_type = $paymentType;

            $useOrgContact = $request->get('profilecontact') ? true : false;

            $payment->first_name = $useOrgContact ? $user->first_name : $request->get('firstname');
            $payment->last_name = $useOrgContact ? $user->last_name : $request->get('lastname');
            $payment->phone = $useOrgContact ? $user->phone_number : $request->get('phone');
            $payment->address1 = $useOrgContact ? $user->address_1 : $request->get('address1');
            $payment->address2 = $useOrgContact ? $user->address_2 : ($request->get('address2') ? $request->get('address2') : null);
            $payment->zip_code = $useOrgContact ? $user->zip_code : $request->get('zip');
            $payment->city = $useOrgContact ? $user->city : $request->get('city');
            $payment->country_code = $useOrgContact ? $user->country_code : $request->get('country');
            $payment->state = $useOrgContact ? $user->state : $request->get('state');
            $payment->created_by = auth()->user()->id;
            $payment->payment_provider_id = $provider->id;

            if ($paymentType === PaymentHelpers::PAYMENT_TYPES[0]) {
                // Stripe

                $stripeData = $this->stripeCustomerRegister($reference, $user, $private_key);
                $payment->properties = $stripeData['properties'];
                $payment->ref_id = $stripeData['customerref'];
                $payment->last4 = $stripeData['last4'];
                $payment->exp_month = (int) $stripeData['exp_month'];
                $payment->exp_year = (int) $stripeData['exp_year'];
                $payment->mode = $stripeData['mode'];

            } else if ($paymentType == PaymentHelpers::PAYMENT_TYPES[1]) {

                if ($request->input('ezidebit_mode') === '2') {
                    // Bpay

                    $bpayData = $this->generateBpayCRN($private_key, $user);
                    $payment->properties = $bpayData['properties'];
                    $payment->ref_id = $bpayData['customerref'];
                    $payment->payment_type = PaymentHelpers::PAYMENT_TYPES[3];

                } else {

                    // Ezidebit
                    $ezidebitData = $this->ezidebitCustomerRegister($reference, $user, $private_key);
                    $payment->properties = $ezidebitData['properties'];
                    $payment->ref_id = $ezidebitData['customerref'];
                    $payment->last4 = $ezidebitData['last4'];
                    $payment->mode = $ezidebitData['mode'];

                    if ($ezidebitData['mode'] === PaymentHelpers::PAYMENT_MODES[1]) {
                        $payment->exp_month = (int) $ezidebitData['exp_month'];
                        $payment->exp_year = (int) $ezidebitData['exp_year'];
                    }

                }

            }

            $payment->status = '0';
            $payment->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new ParentPaymentMethodResource($payment)
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();

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

    public function stripeCustomerRegister($token, User $user, $private_key)
    {

        try {

            Stripe::setApiKey($private_key);

            if (empty($token)) {
                throw new Exception('Stripe Token Undefined', 1001);
            }

            $customer = Customer::create([
                "email" => $user->email,
                "metadata" => [
                    "userid" => $user->id,
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
        } catch (\Stripe\Error\Card $e) {
            // Since it's a decline, \Stripe\Error\Card will be caught
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1002);
        } catch (\Stripe\Error\RateLimit $e) {
            // Too many requests made to the API too quickly
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1003);
        } catch (\Stripe\Error\InvalidRequest $e) {
            // Invalid parameters were supplied to Stripe's API
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1004);
        } catch (\Stripe\Error\Authentication $e) {
            ErrorHandler::log($e);

            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1005);
        } catch (\Stripe\Error\ApiConnection $e) {
            // Network communication with Stripe failed
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e), 1006);
        } catch (\Stripe\Error\Base $e) {
            // Display a very generic error to the user, and maybe send
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception(PaymentHelpers::getStripeError($e));
        } catch (Exception $e) {
            if (isset($customer)) {
                $customer->delete();
            }

            throw new Exception($e);
        }
    }

    /**
     * @return array
     * @throws Exception
     */
    public function ezidebitCustomerRegister($reference, User $user, $private_key)
    {
        try {

            $this->soapWrapper->add('Ezidebit', function ($service) {
                $service
                    ->wsdl(PaymentHelpers::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $soapResponse = $this->soapWrapper->call('Ezidebit.GetCustomerDetails', [
                "GetCustomerDetails" => [
                    "DigitalKey" => $private_key,
                    "YourSystemReference" => $reference
                ]
            ]);

            if ($soapResponse->GetCustomerDetailsResult->Error !== 0) {
                throw new Exception($soapResponse->GetCustomerDetailsResult->ErrorMessage, $soapResponse->GetCustomerDetailsResult->Error);
            }

            $this->soapWrapper->add('EzidebitPci', function ($service) {
                $service
                    ->wsdl(PaymentHelpers::getPaymentConfig('PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $paymentInfo = $this->soapWrapper->call('EzidebitPci.GetCustomerAccountDetails', [
                "GetCustomerAccountDetails" => [
                    "DigitalKey" => $private_key,
                    "YourSystemReference" => $reference
                ]
            ]);

            if ($paymentInfo->GetCustomerAccountDetailsResult->Error !== 0) {
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

            if ($mode === PaymentHelpers::PAYMENT_MODES[1]) {
                $property_data['last4'] = substr($paymentDetails->CreditCardNumber, -4);
                $property_data['exp_month'] = $paymentDetails->ExpiryMonth;
                $property_data['exp_year'] = $paymentDetails->ExpiryYear;
                $property_data['properties']['name'] = $paymentDetails->CardHolderName;
            } else {
                $property_data['last4'] = substr($paymentDetails->AccountNumber, -4);
                $property_data['properties']['name'] = $paymentDetails->AccountHolderName;
            }

            return $property_data;
        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }
    }

    public function generateBpayCRN($private_key, User $user)
    {

        try {

            $this->soapWrapper->add('Ezidebit', function ($service) {
                $service
                    ->wsdl(PaymentHelpers::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                    ->trace(true);
            });

            $payer_ref = PaymentHelpers::generateBpayReference($user);

            $soapResponse = $this->soapWrapper->call('Ezidebit.GetBPayCRN', [
                "GetBPayCRN" => [
                    "DigitalKey" => $private_key,
                    "YourPayerNumber" => $payer_ref,
                    "Username" => $user->first_name
                ]
            ]);

            if ($soapResponse->GetBPayCRNResult->Error !== 0) {
                throw new Exception($soapResponse->GetBPayCRNResult->ErrorMessage, 1000);
            }

            $crnResponse = $soapResponse->GetBPayCRNResult->Data;

            $property_data = [
                "properties" => [
                    "customerid" => $payer_ref,
                    "name" => $user->first_name,
                    "billercode" => $crnResponse->BPayBillerCode
                ],
                "customerref" => $crnResponse->BPayCRN
            ];

            return $property_data;

        } catch (Exception $e) {
            throw new Exception($e->getMessage(), $e->getCode());
        }

    }

    public function listPaymentMethods(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'user_id' => Rule::requiredIf(!auth()->user()->isParent())
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

            $parent_payment_methods = ParentPaymentMethod::whereNull('deleted_at');

            $parent_payment_methods = $this->attachAccessibilityQuery($parent_payment_methods);

            if(auth()->user()->isParent()) {
                // Parent level data
                $user = auth()->user();
                $parent_payment_methods->where('user_id', auth()->user()->id);

            } else {

                // Branch level data
                $user = User::findOrfail(Helpers::decodeHashedID($request->input('user_id')));
                $parent_payment_methods->where('user_id', Helpers::decodeHashedID($request->input('user_id')));

            }

            $parent_payment_methods = $parent_payment_methods->get();

            return (new ParentPaymentMethodResourceCollection($parent_payment_methods, []))
                ->additional([
                    'user' => auth()->user()->isParent() ? null : new UserResource($user, ['basic' => true])
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);

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

    public function parentPaymentMethodDependency(Request $request)
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

            $org_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

            $provider = ParentPaymentProvider::where('branch_id', $branch_id)
                ->where('organization_id', $org_id)
                ->where('status', '0')
                ->get()
                ->first();

            if(!$provider) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('payment.parent_payment_providers_missing')
                    ),
                    RequestType::CODE_400
                );

            }

            $public_key = PaymentHelpers::getProviderKeyPair($provider)['public_key'];

            if($require_user_id) {
                $user = User::findOrFail(Helpers::decodeHashedID($request->input('user_id')));
            } else {
                $user = auth()->user();
            }

            $has_bpay = ParentPaymentMethod::where('user_id', '=', $user->id)->where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[3])->count() > 0 ? true : false;

            $eddr_url = PaymentHelpers::getPaymentConfig('EDDR_URL', 'EZIDEBIT');

            $valid_address = PaymentHelpers::validUserAddress($user);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'valid_address' => $valid_address,
                        'provider' => $provider->payment_type,
                        'reference' => PaymentHelpers::generateParentEzidebitId(),
                        'user' => new UserResource($user),
                        'public_key' => $public_key,
                        'eddr_url' => $eddr_url,
                        'has_bpay' => $has_bpay
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

    /**
     * delete
     */
    public function deletePaymentMethod(Request $request)
    {

        DB::beginTransaction();

        try {

            $id = Helpers::decodeHashedID($request->input('id'));

            $paymentMethod = ParentPaymentMethod::find($id);

            if (is_null($paymentMethod)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
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

            $require_user_id = false;

            if(!auth()->user()->isParent()) {
                $require_user_id = true;
            }

            $validator = Validator::make($request->all(), [
                'id' => ['required'],
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

            $id = Helpers::decodeHashedID($request->get('id'));

            $paymentMethod = ParentPaymentMethod::findOrFail($id);

            if($require_user_id) {
                // Branch
                $user = User::findOrFail(Helpers::decodeHashedID($request->input('user_id')));
            } else {
                // Parent
                $user = auth()->user();
            }

            $paymentMethod->status = '0';
            $paymentMethod->save();

            ParentPaymentMethod::where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id)
                ->where('user_id', $user->id)
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

    public function deactivatePaymentMethod(Request $request)
    {

        DB::beginTransaction();

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

            $id = Helpers::decodeHashedID($request->get('id'));

            $paymentMethod = ParentPaymentMethod::findOrFail($id);
            $paymentMethod->status = '1';
            $paymentMethod->save();

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

    public function addManualPayment(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'date' => Rule::requiredIf($request->input('payment_method') != 'configured_payment'),
                'payment_method' => ['required'],
                'amount' => ['required'],
                'user_id' => ['required']
            ]);

            if ($validator->fails()) {

                DB::rollBack();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $user = User::findOrFail(Helpers::decodeHashedID($request->input('user_id')));

            $amount = $request->input('amount');
            $status = PaymentHelpers::PARENT_PAYMENT_STATUS[3];
            $success = true;
            $payment_ref = PaymentHelpers::generatePaymentReference();
            $transaction_ref = null;
            $fail_message = null;
            $response = null;
            $immediate_processing = true;
            $payment_method_id = null;
            $settlement_date = Carbon::now();

            if ($request->input('payment_method') === 'configured_payment') {

                if ($amount < 2) {

                    DB::rollBack();

                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            'Please input amount greater than 2.00'
                        ),
                        RequestType::CODE_400
                    );

                }

                $pay_result = $this->onDemandPayment($user, $amount);
                $success = $pay_result['success'];
                $status = $pay_result['status'];
                $payment_ref = $pay_result['payment_ref'];
                $transaction_ref = $pay_result['transaction_ref'];
                $fail_message = $pay_result['fail_message'];
                $response = $pay_result['response'];
                $immediate_processing = $pay_result['immediate_processing'];
                $payment_method_id = $pay_result['payment_method_id'];
                $settlement_date = null;
            }

            $payment = new ParentPayment();
            $payment->organization_id = $user->organization_id;
            $payment->branch_id = $user->branch_id;
            $payment->user_id = $user->id;
            $payment->payment_method_id = $payment_method_id;
            $payment->payment_ref = $payment_ref;
            $payment->transaction_ref = $transaction_ref;
            $payment->amount = $amount;
            $payment->date = $request->input('date') ? $request->input('date') : Carbon::now();
            $payment->payment_execution_type = PaymentHelpers::PARENT_PAYMENT_EXECUTION_TYPE[1];
            $payment->payment_generation_type = PaymentHelpers::PARENT_PAYMENT_GENERATION_TYPE[1];
            $payment->manual_payment_type = $request->input('payment_method');
            $payment->comments = $request->input('comments');
            $payment->status = $status;
            $payment->fail_reason = $fail_message;
            $payment->properties = $response ? json_encode($response) : null;
            $payment->settlement_date = $settlement_date;
            $payment->save();

            if ($success) {

                $transaction = new ParentPaymentTransaction();
                $transaction->organization_id = $user->organization_id;
                $transaction->branch_id = $user->branch_id;
                $transaction->parent_id = $user->id;
                $transaction->child_id = null;
                $transaction->ref_id = $payment->id;
                $transaction->date = $request->input('date') ? $request->input('date') : Carbon::now();
                $transaction->transaction_type = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_TYPES[2];
                $transaction->mode = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0];
                $transaction->description = $request->input('comments');
                $transaction->amount = $request->input('amount');
                $transaction->running_total = PaymentHelpers::getRunningTotal($user->id, false, $request->input('amount'), PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0]);
                $transaction->save();

            }


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function onDemandPayment(User $user, $amount)
    {

        $status = null;
        $success = false;
        $payment_ref = PaymentHelpers::generatePaymentReference();
        $transaction_ref = null;
        $fail_message = null;
        $response = null;
        $immediate_processing = false;

        $payment_method = ParentPaymentMethod::where('status', '0')
            ->where('user_id', $user->id)
            ->get()
            ->first();

        $payment_provider = ParentPaymentProvider::findOrFail($payment_method->payment_provider_id);

        $key_pair = PaymentHelpers::getProviderKeyPair($payment_provider);

        if (!$payment_method) {
            throw new Exception('No active payment methods configrued');
        }

        try {

            if ($payment_method->payment_type === PaymentHelpers::PAYMENT_TYPES[1]) {
                // Ezidebit

                $this->soapWrapper->add('Ezidebit', function ($service) {
                    $service
                        ->wsdl(PaymentHelpers::getPaymentConfig('NON_PCI_URL', 'EZIDEBIT'))
                        ->trace(true);
                });

                $soapResponse = $this->soapWrapper->call('Ezidebit.AddPaymentUnique', [
                    "AddPayment" => [
                        "DigitalKey" => $key_pair['private_key'],
                        "YourSystemReference" => $payment_method->ref_id,
                        "DebitDate" => Carbon::now()->format('Y-m-d'),
                        "PaymentAmountInCents" => (int)($amount * 100),
                        "Username" => $payment_method->organization->company_name,
                        "PaymentReference" => $payment_ref
                    ]
                ]);

                if ($soapResponse->AddPaymentUniqueResult->Error === 0) {

                    $status = 'pending';
                    $success = true;

                } else {

                    $status = 'rejected_gateway';
                    $success = false;
                    $fail_message = $soapResponse->AddPaymentUniqueResult->ErrorMessage;
                    $response = $soapResponse->AddPaymentUniqueResult;

                }

            } else if ($payment_method->payment_type === PaymentHelpers::PAYMENT_TYPES[0]) {
                // Stripe

                $immediate_processing = true;

                Stripe::setApiKey($key_pair['private_key']);

                $stripeRes = Charge::create([
                    'amount' => $amount * 100, // Cents
                    'currency' => 'usd',
                    'customer' => $payment_method->ref_id
                ]);

                $success = true;
                $status = 'completed';
                $response = $stripeRes;
                $payment_ref = $stripeRes->id;
                $transaction_ref = $stripeRes->balance_transaction;

            }

        } catch (Exception $e) {

            ErrorHandler::log($e);

            $success = false;
            $fail_message = $e->getMessage();
            $status = 'rejected_gateway';

        }

        return [
            'success' => $success,
            'status' => $status,
            'fail_message' => $fail_message,
            'payment_ref' => $payment_ref,
            'transaction_ref' => $transaction_ref,
            'response' => $response,
            'immediate_processing' => $immediate_processing,
            'payment_method_id' => $payment_method->id
        ];
    }

    public function retryParentPayment(Request $request)
    {

        DB::beginTransaction();

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

            $payment = ParentPayment::findOrFail(Helpers::decodeHashedID($request->input('id')));

            $user = $payment->parent;

            $amount = $payment->amount;

            if ($amount <= 0) {
                throw new Exception('Invalid amount');
            }

            $pay_result = $this->onDemandPayment($user, $amount);
            $success = $pay_result['success'];
            $status = $pay_result['status'];
            $payment_ref = $pay_result['payment_ref'];
            $transaction_ref = $pay_result['transaction_ref'];
            $fail_message = $pay_result['fail_message'];
            $response = $pay_result['response'];
            $immediate_processing = $pay_result['immediate_processing'];
            $payment_method_id = $pay_result['payment_method_id'];

            $payment->payment_method_id = $payment_method_id;
            $payment->payment_ref = $payment_ref;
            $payment->transaction_ref = $transaction_ref;
            $payment->status = $status;
            $payment->fail_reason = $fail_message;
            $payment->properties = $response ? json_encode($response) : null;
            $payment->save();

            if ($success) {

                $transaction = new ParentPaymentTransaction();
                $transaction->organization_id = $user->organization_id;
                $transaction->branch_id = $user->branch_id;
                $transaction->parent_id = $user->id;
                $transaction->child_id = null;
                $transaction->ref_id = $payment->id;
                $transaction->date = $request->input('date') ? $request->input('date') : Carbon::now();
                $transaction->transaction_type = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_TYPES[2];
                $transaction->mode = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0];
                $transaction->description = $request->input('comments');
                $transaction->amount = $amount;
                $transaction->running_total = PaymentHelpers::getRunningTotal($user->id, false, $amount, PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0]);
                $transaction->save();

            }


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function addOneTimeScheduledPayment(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'date' => ['required'],
                'amount' => ['required'],
                'user_id' => ['required']
            ]);

            if ($validator->fails() || ($request->input('amount') < 2)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $user = User::findOrFail(Helpers::decodeHashedID($request->input('user_id')));

            // if (count($user->paymentSchedules) === 0) {
            //     return response()->json(
            //         RequestHelper::sendResponse(
            //             RequestType::CODE_400,
            //             'Please create payment schedule before adding a payment'
            //         ),
            //         RequestType::CODE_400
            //     );
            // }

            $payment = new ParentPayment();
            $payment->organization_id = $user->organization_id;
            $payment->branch_id = $user->branch_id;
            $payment->user_id = $user->id;
            $payment->payment_method_id = null;
            $payment->payment_schedule_id = null; //$user->paymentSchedules->first()->id;
            $payment->payment_ref = null;
            $payment->transaction_ref = null;
            $payment->amount = $request->input('amount');
            $payment->date = $request->input('date');
            $payment->payment_execution_type = PaymentHelpers::PARENT_PAYMENT_EXECUTION_TYPE[0];
            $payment->payment_generation_type = PaymentHelpers::PARENT_PAYMENT_GENERATION_TYPE[1];
            $payment->manual_payment_type = null;
            $payment->comments = $request->input('comments');
            $payment->status = PaymentHelpers::PARENT_PAYMENT_STATUS[0]; // One Time scheduled payments always default to approved status
            $payment->settlement_date = null;
            $payment->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_payment_scheduled_ok')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function listPayments(Request $request)
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

            //query builder
            $account_payments = ParentPayment::with(['parent', 'paymentMethod']);

            $account_payments = $this->attachAccessibilityQuery($account_payments);

            if(auth()->user()->isParent()) {
                $account_payments->where('user_id', '=', auth()->user()->id);
            }

            //get actual count
            $actualCount = $account_payments->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->date) && !empty($filters->date)) {
                    $account_payments->where('date', $filters->date);
                }

                if (isset($filters->parent) && $filters->parent) {
                    $account_payments->where('user_id', Helpers::decodeHashedID($filters->parent));
                }

                if (isset($filters->payment_method) && ($filters->payment_method !== 'all')) {

                    if ($filters->payment_method == 'manual') {
                        $account_payments->where('payment_execution_type', 'manual')
                            ->where('payment_generation_type', 'manual');
                    } else {
                        $account_payments->whereHas('paymentMethod', function($query) use($filters) {
                            $query->where('payment_type', '=', $filters->payment_method);
                        });
                    }

                }

                if (isset($filters->payment_process) && !empty($filters->payment_process) && $filters->payment_process != 'all') {

                    $account_payments->where('payment_execution_type', '=',  $filters->payment_process);

                }

                if (isset($filters->payment_generation) && !empty($filters->payment_generation) && $filters->payment_generation != 'all') {

                    $account_payments->where('payment_generation_type', '=',  $filters->payment_generation);

                }

                if (isset($filters->status) && !empty($filters->status) && $filters->status != 'all') {
                    $account_payments->where('status', $filters->status);
                }

                if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

                    $account_payments->whereHas('parent', function($query) use($filters) {
                        $query->where('status', '=', $filters->parent_status);
                    });

                }

            }

            //search
            if (!is_null($searchValue)) {

                $account_payments->WhereHas('parent', function ($pquery) use ($searchValue) {
                    $pquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%')
                        ->orWhereHas('child', function($chquery) use($searchValue) {
                            $chquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%');
                        });
                });

            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $account_payments->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $account_payments->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $account_payments = $account_payments
                ->paginate($offset);

            return (new ParentPaymentResourceCollection($account_payments, []))
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

    public function getPayment(Request $request)
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

            $payment = ParentPayment::with(['parent', 'paymentMethod'])->findOrfail(Helpers::decodeHashedID($request->input('id')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ParentPaymentResource($payment)
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

    public function updatePayment(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'payment_id' => ['required']
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

            $payment = ParentPayment::findOrfail(Helpers::decodeHashedID($request->input('payment_id')));


            if($request->input('reject') === true) {
                $payment->status = PaymentHelpers::PARENT_PAYMENT_STATUS[5];
            }

            if($request->input('amount')) {
                $payment->amount = $request->input('amount');

                if($request->input('comments')) {
                    $payment->comments = $request->input('comments');
                }

            }

            $payment->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function refundPayment(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'payment_id' => ['required']
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

            $payment = ParentPayment::findOrfail(Helpers::decodeHashedID($request->input('payment_id')));

            if ($payment->status == PaymentHelpers::PARENT_PAYMENT_STATUS[3]) {

                $payment->status = PaymentHelpers::PARENT_PAYMENT_STATUS[6];
                $payment->save();

                $transaction = new ParentPaymentTransaction();
                $transaction->organization_id = auth()->user()->organization_id;
                $transaction->branch_id = auth()->user()->branch_id;
                $transaction->parent_id = $payment->user_id;
                $transaction->ref_id = $payment->id;
                $transaction->date = Carbon::now();
                $transaction->transaction_type = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_TYPES[3];
                $transaction->mode = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1];
                $transaction->description = 'Refund - ' . $payment->payment_ref;
                $transaction->amount = $payment->amount;
                $transaction->running_total = PaymentHelpers::getRunningTotal($payment->user_id, false, $payment->amount, PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1]);

                $transaction->save();

            } else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        'Invalid refund'
                    ),
                    RequestType::CODE_400
                );

            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_payment_refund_success')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function getActivePayment(Request $request)
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

            $payment_method = ParentPaymentMethod::where('status', '0')
                ->where('user_id', Helpers::decodeHashedID($request->input('user_id')))
                ->where('payment_type', '!=', PaymentHelpers::PAYMENT_TYPES[3])
                ->get()
                ->first();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $payment_method
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

    public function emailEzidebitLink(Request $request)
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

            $this->createSingleUserPayment(Helpers::decodeHashedID($request->input('id')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_ezidebit_mail_sent')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function createSingleUserPayment($id, $checkExisting = false)
    {

        if ($checkExisting) {

            $paymentMethodCount = ParentPaymentMethod::where('user_id', '=', $id)
                ->where(function($query) {
                    $query->where('status', '=', '0')->orWhere(function ($subquery) {
                        $subquery->where('status', '=', '1')->where('synced', '=', false);
                    });
                })
                ->count();

            if ($paymentMethodCount > 0) {
                return;
            }

        }

        $user = User::findOrFail($id);
        $org_id = $user->organization_id;
        $branch_id = $user->branch_id;

        $provider = ParentPaymentProvider::where('branch_id', $branch_id)
            ->where('organization_id', $org_id)
            ->where('status', '0')
            ->where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[1])
            ->get()
            ->first();

        if(!$provider) {

            throw new Exception('Payment provider not found. Please configure payment provider from site manager.', 1000);

        }

        $eddr_url = PaymentHelpers::getPaymentConfig('EDDR_URL', 'EZIDEBIT');
        $public_key = PaymentHelpers::getProviderKeyPair($provider)['public_key'];

        $reference = PaymentHelpers::generateParentEzidebitId();

        $payment = new ParentPaymentMethod();
        $payment->organization_id = $org_id;
        $payment->branch_id = $branch_id;
        $payment->user_id = $user->id;
        $payment->ref_id = $reference;
        $payment->payment_type = PaymentHelpers::PAYMENT_TYPES[1];
        $payment->first_name = $user->first_name;
        $payment->last_name = $user->last_name;
        $payment->phone = $user->phone_number;
        $payment->address1 = $user->address_1;
        $payment->address2 = $user->address_2;
        $payment->zip_code = $user->zip_code;
        $payment->city = $user->city;
        $payment->country_code = $user->country_code;
        $payment->state = $user->state;
        $payment->created_by = $user->id;
        $payment->payment_provider_id = $provider->id;
        $payment->synced = false;
        $payment->status = '1';

        $payment->save();

        $final_url = $eddr_url . '?a=' . $public_key . '&debits=4&businessOrPerson=1&uRef=' . $reference . '&email=' . $user->email;

        $user->notify(new OnSendParentEzidebitLink($final_url));

    }

    public function syncPaymentMethod(Request $request)
    {
        DB::beginTransaction();

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

            $payment = ParentPaymentMethod::with(['paymentProvider', 'user'])->findOrFail(Helpers::decodeHashedID($request->input('id')));
            $provider = $payment->paymentProvider;
            $user = $payment->user;
            $private_key = PaymentHelpers::getProviderKeyPair($provider)['private_key'];

            $ezidebitData = $this->ezidebitCustomerRegister($payment->ref_id, $user, $private_key);
            $payment->properties = $ezidebitData['properties'];
            $payment->ref_id = $ezidebitData['customerref'];
            $payment->last4 = $ezidebitData['last4'];
            $payment->mode = $ezidebitData['mode'];

            ParentPaymentMethod::where('user_id', '=', $payment->user_id)
                ->where('organization_id', '=', $payment->organization_id)
                ->where('branch_id', '=', $payment->branch_id)
                ->where('id', '!=', $payment->id)
                ->update(['status' => '1']);

            if ($ezidebitData['mode'] === PaymentHelpers::PAYMENT_MODES[1]) {
                $payment->exp_month = (int) $ezidebitData['exp_month'];
                $payment->exp_year = (int) $ezidebitData['exp_year'];
            }

            $payment->status = '0';
            $payment->synced = true;
            $payment->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_payment_method_synced')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

            DB::rollBack();

            ErrorHandler::log($e);

            $code = $e->getCode();
            $message = LocalizationHelper::getTranslatedText('system.internal_error');

            if ($e->getCode() !== 0) {
                $message = LocalizationHelper::getTranslatedText('payment.' . $code);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $message
                ),
                RequestType::CODE_500
            );

        }

    }

    public function bulkMailEzidebitLink(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'ids' => ['required', 'array']
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

            $ids = $request->input('ids');

            foreach ($ids as $id) {
                $this->createSingleUserPayment(Helpers::decodeHashedID($id), true);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_ezidebit_mail_sent')
                ),
                RequestType::CODE_200
            );

        } catch(\Exception $e) {

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

    public function syncPaymentStatus(Request $request)
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
                'FunctionName' => config('aws.lambda.sync_parent_payment_status'), // REQUIRED
                'InvocationType' => 'Event',
                'Payload' => json_encode([
                    'parent_id' => null,
                    'branch_id' => [$branch_id]
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            $dailyPaymentCheckResult = $lambda->invoke($invoke_obj);

            $bpay_obj = [
                'FunctionName' => config('aws.lambda.bpay_status_check'), // REQUIRED
                'InvocationType' => 'Event',
                'Payload' => json_encode([
                    'parent_id' => null,
                    'branch_id' => [$branch_id],
                    'date' => null
                ]),
                'Qualifier' => strtoupper(config('app.env'))
            ];

            $bpay_result = $lambda->invoke($bpay_obj);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.parent_payment_status_synced')
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

}
