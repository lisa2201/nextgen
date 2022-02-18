<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Addon;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\StatusType;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Notifications\OnEmailVerified;
use Kinderm8\Notifications\OnSubscriptionApproved;
use Kinderm8\Notifications\SendEmailVerification;
use Kinderm8\Organization;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Role;
use Kinderm8\RootAppSettings;
use Kinderm8\SubscriptionPlans;
use Kinderm8\User;
use LocalizationHelper;
use PathHelper;
use PaymentHelpers;
use Kinderm8\EmailVerification as EmailVerify;
use Kinderm8\Notifications\SendNewSubscriptionRootAdmin;
use Kinderm8\OrganizationSubscription;
use RequestHelper;
use TempRolesForOrgAdminSeeder;
use ValidationHelper;

class SubscriptionsController extends Controller
{
    private $userRepo;

    public function __construct(IUserRepository $userRepo)
    {
        $this->userRepo = $userRepo;
    }

    /**
     * Register/Subscribe organization account
     * @param Request $request
     * @return array
     * @throws Exception
     */
    public function subscribeUserAccount(Request $request)
    {

        DB::beginTransaction();

        try
        {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(),[
                'firstname' => ['required'],
                'lastname' => ['required'],
                'companyname' => ['required'],
                'email' => ['required', 'email'],
                'password' => ['required', 'min:7'],
                'timezone' => ['required'],
                'country' => ['required'],
                'phonenumber' => ['required'],
                'address1' => ['required'],
                'companycode' => ['required_if:country,==,AU'],
                'postalCode' => ['required'],
                'state' => ['required'],
                'city' => ['required'],
                'addon' => ['required'],
                'subscriptioncycle' => ['required']
            ]);

            if($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            /*-----------------------------------------------------------*/
            /* check if mail address exists */
            /*-----------------------------------------------------------*/

            $existing_org = Organization::where('email', rtrim($request->input('email')))->get()->first();

            if(!empty($existing_org))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.email_exists'),
                        ['violation' => ValidationHelper::organizationStatusViolation($existing_org, $request->fullUrl())]
                ), RequestType::CODE_400);
            }

            /*-----------------------------------------------------------*/
            /* create organization record */
            /*-----------------------------------------------------------*/

            $addonData = Addon::find(Helpers::decodeHashedID($request->input('addon')));

            //Hardcode data
            $default_grace_period = 10;

            $newOrg = new Organization();

            //required fields
            $newOrg->grace_period = $default_grace_period;
            $newOrg->company_name = $request->input('companyname');
            $newOrg->email = $request->input('email');
            $newOrg->timezone = $request->input('timezone');
            $newOrg->country_code = $request->input('country');
            $newOrg->payment_frequency = 'monthly';
            $newOrg->phone_number = $request->input('phonenumber');
            $newOrg->address_1 = $request->input('address1');
            $newOrg->address_2 = ($request->input('address2') != '') ? $request->input('address2') : null;
            $newOrg->how_did_you_hear = ($request->input('hearAbout') != '') ? $request->input('hearAbout') : null;
            $newOrg->currency = (strtoupper($request->input('country')) == PaymentHelpers::COUNTRY_CODE[0]) ? PaymentHelpers::CURRENCY_CODE[0] : PaymentHelpers::CURRENCY_CODE[1];
            $newOrg->organization_code = $request->input('companycode');
            $newOrg->zip_code = $request->input('postalCode');
            $newOrg->state = $request->input('state');
            $newOrg->city = $request->input('city');
            $newOrg->tax_percentage = (strtoupper($request->input('country')) == PaymentHelpers::COUNTRY_CODE[0]) ? PaymentHelpers::TAX_PERCENTAGE[PaymentHelpers::COUNTRY_CODE[0]] : 0;
            $newOrg->save();

            /*-----------------------------------------------------------*/
            /* create organization subscription */
            /*-----------------------------------------------------------*/

            $price = null;

            if($addonData->split_pricing) {

                $properties = json_decode($addonData->properties, true);

                if($request->input('subscriptioncycle') == 'annually' && isset($properties['annual_price'])) {
                    $price = $properties['annual_price'];
                } elseif($request->input('subscriptioncycle') == 'monthly' && isset($properties['monthly_price'])) {
                    $price = $properties['monthly_price'];
                } else {
                    throw new Exception('Pricing data not specified');
                }

            } else {

                $price = $addonData->price;

            }

            $orgSubscription = new OrganizationSubscription();
            $orgSubscription->organization_id = $newOrg->id;
            $orgSubscription->addon_id = $addonData->id;
            $orgSubscription->title = $addonData->title;
            $orgSubscription->description = $addonData->description;
            $orgSubscription->price = $price;
            $orgSubscription->unit_type = $addonData->unit_type;
            $orgSubscription->minimum_price = $addonData->minimum_price;
            $orgSubscription->trial_period = $addonData->trial_period;
            $orgSubscription->plugin = $addonData->plugin;
            $orgSubscription->status = OrganizationSubscription::INACTIVE_STATUS;
            $orgSubscription->save();

            unset($addonData);

            /*-----------------------------------------------------------*/
            /* create owner account */
            /*-----------------------------------------------------------*/

            $userAccount = new User();
            $userAccount->first_name = $request->input('firstname');
            $userAccount->last_name = $request->input('lastname');
            $userAccount->email = $request->input('email');
            $userAccount->password = bcrypt($request->input('password'));
            $userAccount->status = '1'; // not active
            $userAccount->organization_id = $newOrg->id;
            $userAccount->save();

            /*-----------------------------------------------------------*/
            /* send email verification mail */
            /*-----------------------------------------------------------*/

            $emailVerify = new EmailVerify();
            $emailVerify->organization_id = $newOrg->id;
            $emailVerify->user_id = $userAccount->id;
            $emailVerify->token = Helpers::generateToken();
            $emailVerify->expires_at = Carbon::now()->addDays((int) config('org-config.token_expiry'));
            $emailVerify->save();

            /*-----------------------------------------------------------*/

            DB::commit();

            /*-------------------- Send mail ----------------------------*/

            $userAccount->notify(new SendEmailVerification(
                PathHelper::getSubscriptionEmailVerificationPath($request->fullUrl(), $emailVerify->token),
                $emailVerify
            ));

            /*-----------------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    [ 'token' => $emailVerify->token]
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('response.error_process')
            ), RequestType::CODE_500);
        }
    }

    /**
     * verify subscription email
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function verifySubscriptionEmail(Request $request)
    {

        DB::beginTransaction();

        try
        {
            $obj = null;
            $token = $request->input('token');
            $status = false;
            $expired = false;
            $message = '';

            $obj = EmailVerify::where('token', '=', $token)
                ->get()
                ->first();

            if ($obj != null && !$obj->isExpired())
            {
                //update status
                $orgObj = Organization::find($obj->organization_id);
                $orgObj->status = StatusType::EMAIL_VERIFY;
                $orgObj->email_verified = true;
                $orgObj->save();

                //verify user
                $tempUserObj = $this->userRepo->findById($obj->user_id, []);
                $tempUserObj->email_verified = true;
                $tempUserObj->save();

                // Root admins
                $root_admins = User::PortalAdmin()->get();

                /*-----------------------------------------------------------*/
                /* automated user subscription approval */
                /*-----------------------------------------------------------*/

                if(RootAppSettings::where('key', 'auto_accept_all_subscriptions')->get()->first()->value)
                {
                    $userAccount = $orgObj->user;

                    //attach role to user - site owner
                    $userAccount->syncRoles(Role::whereName('portal-org-admin')->first());

                    //attach branch admin access to owner
                    //$userAccount->syncRoles(Role::whereName('org-admin')->first());

                    //create temp user roles [ branch-admin, staff, parent ]
                    $roleSeeder = new TempRolesForOrgAdminSeeder();
                    $roleSeeder->run($orgObj->id);

                    //commit db changes
                    DB::commit();

                    //send mail
                    // $userAccount->notify(new OnSubscriptionApproved(
                    //     PathHelper::getSiteManagerPath($request->fullUrl())
                    // ));
                }
                else
                {

                    //delete link
                    $obj->delete();

                    //commit db changes
                    DB::commit();

                    //send email verified mail
                    $tempUserObj->notify(new OnEmailVerified());

                    // Send email to root admins
                    foreach ($root_admins as $r_user) {
                        $r_user->notify(new SendNewSubscriptionRootAdmin($orgObj, PathHelper::getPortalPath($request->fullUrl())));
                    }

                }

                $status = true;
                $message = LocalizationHelper::getTranslatedText('email_verification.email_verified');
            }
            else
            {
                if($obj != null && $obj->isExpired())
                {
                    $expired = true;
                    $message = LocalizationHelper::getTranslatedText('email_verification.link_expired');
                }
                else
                {
                    $status = null;
                    $message = LocalizationHelper::getTranslatedText('email_verification.invalid_uri');
                }
            }
        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                [
                    'active' => $status,
                    'expired' => $expired,
                    'message' => $message
                ]
            ), RequestType::CODE_200);
    }

    /**
     * get subscription data
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function checkSubscriptionData(Request $request)
    {
        $org = null;

        try
        {
            $user_id = ($request->input('userid') != '') ? Helpers::decodeHashedID(rtrim($request->input('userid'))) : null;

            if ($user_id != null)
            {
                $org = $this->userRepo->findById($user_id, ['organization'])->organization;
            }

            return (new OrganizationResource($org, [ 'getPaymentInfo' => true ]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    /**
     * get all subscriptions
     * @return JsonResponse {array} list list
     */
    public function get()
    {
        try
        {
            $orglist = Organization::where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->cursor();

            return (new OrganizationResourceCollection($orglist, [ 'showCard' => false ]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
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
     * get subscription details
     * @param Request $request
     * @return mixed
     */
    public function view(Request $request)
    {
        $subInfo = null;

        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));
            $subInfo = Organization::with('current_plan')->find($id);

            return (new OrganizationResource($subInfo, [ 'showCard' => true ]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
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
     * approve subscription - one or many
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function approve(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $request_ids = $request->input('indexs');
            $ids = Helpers::decodeHashedID($request_ids);

            $updatedItems = [];
            $approvedUserObjects = [];

            foreach ($ids as $key => $item)
            {
                /*--------------------------------------------------*/
                /* update status for organization and user */
                /*--------------------------------------------------*/

                $org = Organization::find($item);
                /*if($org->current_plan->name != config('subscripton.plans.P1')) {
                    $org->trial_end_date = Carbon::now()->addDays(config('org-config.subscription_trial_days'))->format('Y-m-d');
                }
                $org->subscription_start_date = Carbon::now()->format('Y-m-d');*/
                $org->payment_status = StatusType::PAY_TRIAL;
                $org->status = StatusType::ACTIVE;
                $org->save();

                $userAccount = $org->user;
                $userAccount->email_verified = true;
                $userAccount->status = '0';
                $userAccount->save();

                /*--------------------------------------------------*/

                array_push($updatedItems, $request_ids[$key]);
                array_push($approvedUserObjects, $userAccount);

                /*--------------------------------------------------*/
                /* create temp user and roles */
                /*--------------------------------------------------*/

                //attach role to user - site owner
                $userAccount->syncRoles(Role::whereName('portal-org-admin')->first());

                //attach branch admin access to owner
                //$userAccount->syncRoles(Role::whereName('org-admin')->first());

                //create temp user roles [ branch-admin, staff, parent ]
                $roleSeeder = new TempRolesForOrgAdminSeeder();
                $roleSeeder->run($org->id);

                /*--------------------------------------------------*/

                unset($org);
            }

            DB::commit();

            /*--------------------------------------------------*/
            /* all good -> (notifiable) -> send mail */
            /*--------------------------------------------------*/

            foreach ($approvedUserObjects as $key => $userObject)
            {
                //send subscription approve email
                $userObject->notify(new OnSubscriptionApproved(
                    PathHelper::getSiteManagerPath($request->fullUrl())
                ));
            }

            /*-----------------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_204,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_204);
        }
        catch (\Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    /**
     * reject subscription - one or many
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function disapprove(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $request_ids = $request->input('indexs');
            $ids = Helpers::decodeHashedID($request_ids);

            $updatedItems = [];
            $rejectedUserObjects = [];

            foreach ($ids as $key => $item)
            {
                /*--------------------------------------------------*/
                /* update status for organization  */
                /*--------------------------------------------------*/

                $org = Organization::find($item);
                $org->status = StatusType::DEACTIVE;
                $org->save();

                array_push($updatedItems, $request_ids[$key]);
                array_push($rejectedUserObjects, $org->user);

                unset($org);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    public function resendVerifyEmail(Request $request)
    {

        try {

            $token = $request->input('token');

            if(empty($token))
            {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );

            }

            $verifyObj = EmailVerify::where('token', '=', $token)->get()->first();

            if(!$verifyObj) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.token_invalid')
                    ),
                    RequestType::CODE_400
                );

            }

            $verifyObj->expires_at = Carbon::now()->addDays((int) config('org-config.token_expiry'));

            $user = $verifyObj->user;

            $user->notify(new SendEmailVerification(
                PathHelper::getSubscriptionEmailVerificationPath($request->fullUrl(), $verifyObj->token),
                $verifyObj
            ));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    ['user' => $verifyObj->user]
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
