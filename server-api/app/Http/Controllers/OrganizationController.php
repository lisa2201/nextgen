<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Enums\StatusType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\OrganizationBranchAccessRequest;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Notifications\OnSubscriptionApproved;
use Kinderm8\Notifications\SendQuotationVerification;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\RootAppSettings;
use Kinderm8\Role;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\Subscriber;
use Kinderm8\User;
use LocalizationHelper;
use RequestHelper;
use TempRolesForOrgAdminSeeder;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use DBHelper;
use PathHelper;
use Kinderm8\EmailVerification as EmailVerify;
use Kinderm8\Notifications\OnEmailVerifiedAdmin;
use Kinderm8\Notifications\SendCustPlanEmailVerification;
use Kinderm8\Organization;
use Kinderm8\Addon;
use Kinderm8\Http\Resources\OrganizationSubscriptionResourceCollection;
use Kinderm8\Notifications\OnCustomSubscriptionApproved;
use Kinderm8\Notifications\OnQuotationVerifiedAdmin;
use Kinderm8\OrganizationSubscription;
use Kinderm8\QuotationVerification;
use ValidationHelper;
use Kinderm8\Repositories\AllergyTypes\IAllergyTypesRepository;

class OrganizationController extends Controller
{
    use Subscriber;

    private $organizationRepo;
    private $userRepo;
    private $roleRepo;
    private $branchRepo;
    private $snsService;
    private $allergyTypeRepo;

    public function __construct(IOrganizationRepository $organizationRepo, IUserRepository $userRepo, IRoleRepository $roleRepo, IBranchRepository $branchRepo, SNSContract $snsService, IAllergyTypesRepository $allergyTypesRepo)
    {
        $this->organizationRepo = $organizationRepo;
        $this->userRepo = $userRepo;
        $this->roleRepo = $roleRepo;
        $this->branchRepo = $branchRepo;
        $this->snsService = $snsService;
        $this->allergyTypeRepo = $allergyTypesRepo;
    }

    /**
     * Approve Organization
     * @param Request $request
     * @return JsonResponse
     */
    public function approveOrganization(Request $request)
    {
        try {
            $token = $request->input('token');

            $organization = Organization::where('token', '=', $token)
                ->get()
                ->first();

            if (is_null($organization)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return (new OrganizationResource($organization, ['basic' => true]))
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

    /**
     * Check Email Exists
     * @param Request $request
     * @return JsonResponse
     */
    public function emailExistsOrganization(Request $request)
    {
        try {
            $value = rtrim($request->input('value'));

            $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;

            /* --------------- get organization -----------------*/

            $indexOrg = 0;

            if (auth()->user()->isRoot())
            {
                $indexOrg = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('org_id')) : null;
            }
            elseif (auth()->user()->hasOwnerAccess())
            {
                $indexOrg = auth()->user()->organization_id;
            }
            else
            {
                if (!auth()->user()->isParent())
                {
                    $indexOrg = auth()->user()->organization_id;
                }
            }

            /* -------------------------------------*/

            $query = Organization::where('email', '=', $value)->where('organization_id',  $indexOrg);

            //ignore this data
            if (!is_null($index)) {
                $query->where('id', '!=', $index);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    ['found' => (($query->get()->count() > 0) ? true : false)]
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
     * Get Organization
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $data = $this->organizationRepo->list([], [], $request);

        return (new OrganizationResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getOrg(Request $request)
    {

        try {

            $orgId = auth()->user()->organization->id;

            $org = Organization::with('user')->find($orgId);

            return (new OrganizationResource($org, ['getSubInfo' => true]))
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

    /***
     * Store organization object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try {
            //create organization record
            $newOrg = new Organization();
            //required fields
            $newOrg->company_name = $request->input('company_name');
            $newOrg->email = $request->input('email');
            $newOrg->status = (!$request->input('status')) ? '1' : '0';
            //non-required fields
            $newOrg->phone_number = ($request->input('phone_number') != '') ? $request->input('phone_number') : null;
            $newOrg->fax_number = ($request->input('fax') != '') ? $request->input('fax') : null;
            $newOrg->address_1 = ($request->input('address_1') != '') ? $request->input('address_1') : null;
            $newOrg->address_2 = ($request->input('address_2') != '') ? $request->input('address_2') : null;
            $newOrg->zip_code = ($request->input('zipcode') != '') ? $request->input('zipcode') : null;
            $newOrg->city = ($request->input('city') != '') ? $request->input('city') : null;
            $newOrg->country_code = ($request->input('country') != '') ? $request->input('country') : null;
            $newOrg->save();

            //create owner account
            $userAccount = new User();
            $userAccount->email = $request->input('email');
            $userAccount->password = bcrypt('testuser');
            $userAccount->status = '0';
            $userAccount->organization_id = $newOrg->id;
            $userAccount->save();

            //attach role to user - site owner
            $userAccount->syncRoles(Role::whereName('portal-org-admin')->first());

            //create temp user roles [ branch-admin, 'staff', parent ]
            $roleSeeder = new TempRolesForOrgAdminSeeder();
            $roleSeeder->run($newOrg->id);

            //insert allergy types
            $this->allergyTypeRepo->importDefaultType($newOrg->id);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
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

    /**
     * Create Organization
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create_subscriber(Request $request)
    {
        DB::beginTransaction();

        try {
            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [

                // 'first_name' => 'required',
                // 'last_name' => 'required',
                'company_name' => 'required',
                'email' => 'required|email',
                'timezone',
                'country',
                'paymentfrequency',
                'companycode',
                'postalCode',
                'state',

                'phone_number',
                'address_1',
                'address_2',
                'city',
                'country_code',

                'no_of_branches',
                'organization_type',
                'how_did_you_hear'
            ]);



            if ($validator->passes()) {

                $newOrgCust = new Organization();
                //required fields

                // $newOrgCust->first_name = $request->input('first_name');
                // $newOrgCust->last_name = $request->input('last_name');
                $newOrgCust->company_name = $request->input('company_name');
                $newOrgCust->email = $request->input('email');

                //non-required fields
                $newOrgCust->phone_number = $request->input('phone_number') ? $request->input('phone_number') : null;
                $newOrgCust->address_1 = $request->input('address_1') ? $request->input('address_1') : null;
                $newOrgCust->address_2 = $request->input('address_2') ? $request->input('address_2') : null;
                $newOrgCust->city = $request->input('city') ? $request->input('city') : null;
                $newOrgCust->country_code = $request->input('country_code') ? $request->input('country_code') : null;

                $newOrgCust->no_of_branches = ($request->input('no_of_branches') != '') ? $request->input('no_of_branches') : null;
                $newOrgCust->organization_type = ($request->input('organization_type') != '') ? $request->input('organization_type') : null;
                $newOrgCust->how_did_you_hear = ($request->input('how_did_you_hear') != '') ? $request->input('how_did_you_hear') : null;

                //hard coded
                $newOrgCust->payment_frequency = 'monthly';

                $newOrgCust->save();

                //insert allergy types
                $this->allergyTypeRepo->importDefaultType($newOrgCust->id);

                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(

                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        [
                            'success' => 'Added new records',

                        ]
                    ),
                    RequestType::CODE_201
                );
            } else {
                return response()->json(['error' => $validator->errors()->all()]);
            }
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

    /**
     * Create Custom Plan GET
     */
    public function create_cust()
    {

        try {

            return view('create_cust');
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'success' => 'OK'

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
     * Create Custom Plan POST
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create_cust_plan(Request $request)
    {
        DB::beginTransaction();

        try {

            $v1 = $request->input('hearAboutOther');

            if ($v1 == null) {
                $hear = $request->input('hearAbout');
            } else if (!$v1 == null) {
                $hear = $v1;
            }

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [

                'first_name' => 'required',
                'last_name' => 'required',
                'company_name' => 'required',
                'email' => 'required|email',
                'password' => ['required', 'min:7'],

                'timezone' => ['required'],
                'country' => ['required'],
                // 'payment_frequency' => ['required'],
                'companycode' => ['required_if:country,==,AU'],
                'postalCode' => ['required'],

                'timezone' => ['required'],
                'phone_number' => 'required',
                'address_1' => 'required',
                'state' => 'required',

                'city' => 'required',
                // 'country_code' => 'required',
                // 'addon_id' => 'required',
                'addon_id' => 'required',

                'no_of_branches' => 'required',
                'subscriptioncycle' => 'required',
                'organization_type',
                'hearAbout',
                'hearAboutOther',
                'address_2',

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

            /*-----------------------------------------------------------*/
            /* check if mail address exists */
            /*-----------------------------------------------------------*/

            $existing_org = Organization::where('email', rtrim($request->input('email')))->get()->first();

            if (!empty($existing_org)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.email_exists'),
                        ['violation' => ValidationHelper::organizationStatusViolation($existing_org, $request->fullUrl())]
                    ),
                    RequestType::CODE_400
                );
            }

            /*-----------------------------------------------------------*/
            /* create organization record */
            /*-----------------------------------------------------------*/
            // $addId = Helpers::decodeHashedID($request->input('addon_id'));
            $addonData = Addon::find(Helpers::decodeHashedID($request->input('addon_id')));

            $newOrgCust = new Organization();
            // $addonData = Addon::find(Helpers::decodeHashedID($request->input('addon')));

            //required fields
            // $newOrgCust->first_name = $request->input('first_name');
            // $newOrgCust->last_name = $request->input('last_name');
            $newOrgCust->company_name = $request->input('company_name');
            $newOrgCust->email = $request->input('email');
            $newOrgCust->phone_number = $request->input('phone_number');
            $newOrgCust->address_1 = $request->input('address_1');
            $newOrgCust->address_2 = $request->input('address_2');
            $newOrgCust->city = $request->input('city');
            // $newOrgCust->country_code = $request->input('country_code');
            $newOrgCust->payment_frequency = $request->input('payment_frequency');
            $newOrgCust->timezone = $request->input('timezone');
            $newOrgCust->country_code = $request->input('country');
            $newOrgCust->organization_code = $request->input('companycode');
            $newOrgCust->zip_code = $request->input('postalCode');
            $newOrgCust->state = $request->input('state');
            $newOrgCust->timezone = $request->input('timezone');
            // $newOrgCust->addon_id = $addId;

            //non-required fields
            $newOrgCust->no_of_branches = ($request->input('no_of_branches') != '') ? $request->input('no_of_branches') : null;
            $newOrgCust->organization_type = ($request->input('organization_type') != '') ? $request->input('organization_type') : null;
            // $newOrgCust->how_did_you_hear = ($request->input('how_did_you_hear') != '') ? $request->input('how_did_you_hear') : null;
            // $newOrgCust->how_did_you_hear = ($request->input('hearAbout') != '') ? $request->input('howdidyouhear') : null;
            $newOrgCust->how_did_you_hear = $hear;
            $newOrgCust->save();

            /*-----------------------------------------------------------*/
            /* create owner account */
            /*-----------------------------------------------------------*/

            $userAccount = new User();
            $userAccount->first_name = $request->input('first_name');
            $userAccount->last_name = $request->input('last_name');
            $userAccount->email = $request->input('email');
            $userAccount->status = '1'; // not active
            $userAccount->organization_id = $newOrgCust->id;
            $userAccount->password = bcrypt($request->input('password'));
            $userAccount->save();


            /*-----------------------------------------------------------*/
            /* create organization subscription */
            /*-----------------------------------------------------------*/

            $price = null;

            if ($addonData->split_pricing) {

                $properties = json_decode($addonData->properties, true);

                if ($request->input('subscriptioncycle') == 'annually' && isset($properties['annual_price'])) {
                    $price = $properties['annual_price'];
                } elseif ($request->input('subscriptioncycle') == 'monthly' && isset($properties['monthly_price'])) {
                    $price = $properties['monthly_price'];
                } else {
                    throw new Exception('Pricing data not specified');
                }
            } else {

                $price = $addonData->price;
            }

            $orgSubscription = new OrganizationSubscription();
            $orgSubscription->organization_id = $newOrgCust->id;
            $orgSubscription->addon_id = $addonData->id;
            $orgSubscription->price = $price;
            $orgSubscription->unit_type = $addonData->unit_type;
            $orgSubscription->minimum_price = $addonData->minimum_price;
            $orgSubscription->addon_start_date = '2019-10-12';
            $orgSubscription->trial_period = $addonData->trial_period;
            $orgSubscription->plugin = $addonData->plugin;
            $orgSubscription->custom = true;
            $orgSubscription->status = OrganizationSubscription::INACTIVE_STATUS;
            $orgSubscription->save();
            unset($addonData);

            /*-----------------------------------------------------------*/
            /* send email verification mail */
            /*-----------------------------------------------------------*/

            $emailVerify = new EmailVerify();
            $emailVerify->organization_id = $newOrgCust->id;
            $emailVerify->user_id = $userAccount->id;
            $emailVerify->token = Helpers::generateToken();
            // $emailVerify->expires_at = Carbon::now()->addDays((int) config('org-config.token_expiry'));
            $emailVerify->expires_at = Carbon::now()->addDays((int) config('org-config.quote_token_expiry'));
            $emailVerify->save();

            //insert allergy types
            $this->allergyTypeRepo->importDefaultType($newOrgCust->id);

            DB::commit();

            /*-------------------- Send mail ----------------------------*/

            //   $userAccount->notify(new SendEmailVerification(
            //     PathHelper::getSubscriptionEmailVerificationPath($request->fullUrl(), $emailVerify->token),
            //     $emailVerify
            // ));


            $userAccount->notify(new SendCustPlanEmailVerification(
                PathHelper::getCustPlanEmailVerificationPath($request->fullUrl(), $emailVerify->token),
                $emailVerify
            ));

            /*-----------------------------------------------------------*/


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    ['verifyToken' => $emailVerify->token]
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {
            DB::rollBack();

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

    /**
     * View organization object
     * @param Request $request
     * @return array
     */
    public function edit(Request $request)
    {
        try {
            $id = Helpers::decodeHashedID($request->input('index'));

            $object = Organization::find($id);

            if (is_null($object)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new OrganizationResource($object)
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
     * Update organization object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            $orgObj = Organization::withTrashed()->find($id);
            $orgObj->company_name = $request->input('company_name');
            $orgObj->email = $request->input('email');
            $orgObj->status = (!$request->input('status')) ? '1' : '0';
            $orgObj->phone_number = ($request->input('phone_number') != '') ? $request->input('phone_number') : null;
            $orgObj->fax_number = ($request->input('fax') != '') ? $request->input('fax') : null;
            $orgObj->address_1 = ($request->input('address_1') != '') ? $request->input('address_1') : null;
            $orgObj->address_2 = ($request->input('address_2') != '') ? $request->input('address_2') : null;
            $orgObj->zip_code = ($request->input('zipcode') != '') ? $request->input('zipcode') : null;
            $orgObj->city = ($request->input('city') != '') ? $request->input('city') : null;
            $orgObj->country_code = ($request->input('country') != '') ? $request->input('country') : null;
            $orgObj->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_204,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_204
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

    /**
     * Update Subscriber
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function update_subscriber(Request $request)
    {
        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            $orgObj = Organization::withTrashed()->find($id);

            // $orgObj->first_name = $request->input('first_name');
            // $orgObj->last_name = $request->input('last_name');
            $orgObj->company_name = $request->input('company_name');
            $orgObj->email = $request->input('email');

            //non-required fields
            $orgObj->phone_number = $request->input('phone_number') ? $request->input('phone_number') : null;
            $orgObj->address_1 = $request->input('address_1') ? $request->input('address_1') : null;
            $orgObj->address_2 = $request->input('address_2') ? $request->input('address_2') : null;
            $orgObj->city = $request->input('city') ? $request->input('city') : null;
            $orgObj->country_code = $request->input('country_code') ? $request->input('country_code') : null;

            $orgObj->no_of_branches = ($request->input('no_of_branches') != '') ? $request->input('no_of_branches') : null;
            $orgObj->organization_type = ($request->input('organization_type') != '') ? $request->input('organization_type') : null;
            $orgObj->how_did_you_hear = ($request->input('how_did_you_hear') != '') ? $request->input('how_did_you_hear') : null;

            $orgObj->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new OrganizationResource($orgObj)
                ),
                RequestType::CODE_200
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

    /**
     * Sofe delete organization object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            //$fourceDelete = ($request->input('forceDel') != '') ? filter_var($request->input('forceDel'), FILTER_VALIDATE_BOOLEAN) : false;

            $orgObj = Organization::withTrashed()->find($id);

            if (is_null($orgObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            if (!is_null($orgObj->deleted_at)) {
                $orgObj->forceDelete();
            } else {
                $orgObj->delete();
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
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

    /**
     * get branches based on organization
     * @param Request $request
     * @return mixed
     */
    public function getBranches(Request $request)
    {
        $branch = [];

        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            $orgObj = Organization::withTrashed()->with('branch')->find($id);

            if (is_null($orgObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $branch = $orgObj->branch;
        } catch (Exception $e) {
            ErrorHandler::log($e);
        }

        return (new BranchResourceCollection($branch, ['short' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * Organization List
     * @param Request $request
     * @return JsonResponse|string
     */
    public function subscribersList(Request $request)
    {
        // $orglist = [];
        try {
            // $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;
            // $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;


            // $sortColumn = (! Helpers::IsNullOrEmpty($request->input('sort_field')) && is_null($searchValue)) ? $this->sortColumnsMap[$request->input('sort_field')] : null;
            // $sortValue = (! Helpers::IsNullOrEmpty($request->input('sort_order')) && is_null($searchValue)) ? DBHelper::TABLE_SORT_VALUE_MAP[$request->input('sort_order')] : null;
            // $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;


            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;




            $orglist = Organization::with([]);
            // $orglist = Organization::withTrashed()->orderBy('id', 'asc')->get();
            // $orglist = Organization::all();

            //search
            // if(!is_null($searchValue))
            // {
            //     $orglist->where('name', 'LIKE', '%' . $searchValue . '%')
            //         ->orWhere('email', 'LIKE', '%' . $searchValue . '%')
            //         ->orWhereHas('city', function($query) use ($searchValue)
            //         {
            //             return $query->where('name', 'LIKE', '%' . $searchValue . '%');
            //         });
            // }


            //filters
            if (!is_null($filters)) {
                if (isset($filters->status) && $filters->status !== '0') {
                    //       $orglist->whereRaw("DATE(km8_organization.deleted_at) " . (($filters->status === '1') ? "<" : ">") . " '" . Carbon::now()->toDateString() . "'");

                }
            }

            //search
            if (!is_null($searchValue)) {
                $orglist->whereLike([
                    'km8_organization.company_name',
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $orglist->orderBy(
                    $this->sortColumnsMap[$sortOption->key],
                    DBHelper::TABLE_SORT_VALUE_MAP[$sortOption->value]
                );
            } else {
                $orglist->orderBy('km8_organization.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }


            $orglist = $orglist
                ->select(['km8_organization.*'])
                ->paginate($offset);

            // $users = DB::table('users')->paginate(15);
            // return view('user.index', ['users' => $users]);
            // $orglist = DB::table('km8_organization')->paginate(15);


            // $orglist = $orglist->paginate($offset);


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

        return (new OrganizationResourceCollection($orglist))
            ->response()
            ->setStatusCode(RequestType::CODE_200);

        // return response()->json(
        //     RequestHelper::sendResponse(
        //         RequestType::CODE_200,
        //         LocalizationHelper::getTranslatedText('response.OK'),
        //         ['subscribers' => new OrganizationResourceCollection($orglist)]
        //     ), RequestType::CODE_200);




    }

    /**
     * Get Organization Info
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getInfo(Request $request)
    {
        try
        {
            $rowObj = $this->organizationRepo->findById(Helpers::decodeHashedID($request->input('id')), ['user', 'branch'], false);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return (new OrganizationResource($rowObj, [ 'withBranch' => true, 'withUser' => true ]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Verify Subscription Email
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function verifySubscriptionEmail(Request $request)
    {
        DB::beginTransaction();

        try {
            $obj = null;
            $token = $request->input('token');
            $status = false;
            $expired = false;
            $message = '';

            $obj = EmailVerify::where('token', '=', $token)
                ->get()
                ->first();

            if ($obj != null && !$obj->isExpired()) {
                //update status
                $orgObj = Organization::find($obj->organization_id);
                $orgObj->status = StatusType::EMAIL_VERIFY;
                $orgObj->email_verified = true;
                $orgObj->save();

                //verify user
                $tempUserObj = $this->userRepo->findById($obj->user_id, []);
                $tempUserObj->email_verified = true;
                $tempUserObj->save();

                /*-----------------------------------------------------------*/
                /* Email */
                /*-----------------------------------------------------------*/
                $root_admins = User::PortalAdmin()->get();

                foreach ($root_admins as $r_user) {
                    $r_user->notify(new OnEmailVerifiedAdmin($orgObj, PathHelper::getPortalPath($request->fullUrl())));
                }

                /*-----------------------------------------------------------*/
                /* automated user subscription approval */
                /*-----------------------------------------------------------*/
                if (RootAppSettings::where('key', 'auto_accept_all_subscriptions')->get()->first()->value) {
                    $userAccount = $orgObj->user;

                    //attach role to user - site owner
                    $userAccount->syncRoles(Role::whereName('')->first());

                    //attach branch admin access to owner
                    $userAccount->syncRoles(Role::whereName('portal-org-admin')->first());

                    //create temp user roles [ branch-admin, staff, parent ]
                    $roleSeeder = new TempRolesForOrgAdminSeeder();
                    $roleSeeder->run($orgObj->id);

                    //commit db changes
                    DB::commit();

                    //send mail
                    // $userAccount->notify(new OnSubscriptionApproved(
                    //     PathHelper::getSiteManagerPath($request->fullUrl())
                    // ));
                } else {

                    //delete link
                    $obj->delete();

                    //commit db changes
                    DB::commit();

                    //send email verified mail
                    // $tempUserObj->notify(new OnEmailVerified());
                }

                $status = true;
                $message = LocalizationHelper::getTranslatedText('email_verification.email_verified');
            } else {
                if ($obj != null && $obj->isExpired()) {
                    $expired = true;
                    $message = LocalizationHelper::getTranslatedText('email_verification.link_expired');
                } else {
                    $status = null;
                    $message = LocalizationHelper::getTranslatedText('email_verification.invalid_uri');
                }
            }
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

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                [
                    'active' => $status,
                    'expired' => $expired,
                    'message' => $message
                ]
            ),
            RequestType::CODE_200
        );
    }

    /**
     * Resend Verify Email
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function resendVerifyEmail(Request $request)
    {
        DB::beginTransaction();

        try {

            $token = $request->input('token');



            if (empty($token)) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $verifyObj = EmailVerify::where('token', '=', $token)->get()->first();

            if (!$verifyObj) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.token_invalid')
                    ),
                    RequestType::CODE_400
                );
            }


            $verifyObj->expires_at = Carbon::now()->addDays((int) config('org-config.token_expiry'));
            $verifyObj->save();

            DB::commit();

            $userObj = $verifyObj->user;

            $userObj->notify(new SendCustPlanEmailVerification(
                PathHelper::getCustPlanEmailVerificationPath($request->fullUrl(), $verifyObj->token),
                $verifyObj
            ));

            return
                response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        ['user' => $verifyObj->user]
                    ),
                    RequestType::CODE_200
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

    /**
     * Approve the Subscriber TODO
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function approve1(Request $request)
    {
        DB::beginTransaction();

        try {
            $request_ids = $request->input('id');
            $ids = Helpers::decodeHashedID($request_ids);

            $updatedItems = [];
            $approvedUserObjects = [];

            foreach ($ids as $key => $item) {
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

                $userAccount = User::find($org->user->id);
                $userAccount->email_verified = true;
                $userAccount->status = '0';
                $userAccount->save();

                /*--------------------------------------------------*/

                array_push($updatedItems, $request_ids[$key]);
                array_push($approvedUserObjects, $org->user);

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

            foreach ($approvedUserObjects as $key => $userObject) {
                //send subscription approve email
                $userObject->notify(new OnSubscriptionApproved(
                    PathHelper::getSiteManagerPath($request->fullUrl())
                ));
            }

            /*-----------------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
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

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function approve(Request $request)
    {
        DB::beginTransaction();

        try {
            $request_ids = $request->input('indexs');
            $ids = Helpers::decodeHashedID($request_ids);

            $updatedItems = [];
            $approvedUserObjects = [];

            foreach ($ids as $key => $item) {
                /*--------------------------------------------------*/
                /* update status for organization and user */
                /*--------------------------------------------------*/

                $org = Organization::find($item);
                /*if($org->current_plan->name != config('subscripton.plans.P1')) {
                    $org->trial_end_date = Carbon::now()->addDays(config('org-config.subscription_trial_days'))->format('Y-m-d');
                }
                $org->subscription_start_date = Carbon::now()->format('Y-m-d');*/

                if ($org->status === 'email_verification') {
                    $org->payment_status = StatusType::PAY_TRIAL;
                    $org->status = StatusType::ACTIVE;

                    $userAccount = User::find($org->user->id);
                    $userAccount->email_verified = true;
                    $userAccount->status = '0';
                    $userAccount->save();
                } else {
                    continue;
                }

                $orgSubscription = OrganizationSubscription::where('organization_id', $org->id)->first();

                if ($orgSubscription->trial_period) {
                    $orgSubscription->trial_start_date = Carbon::now();
                    $orgSubscription->trial_end_date = Carbon::now()->addDays($orgSubscription->trial_period);
                    $orgSubscription->status = OrganizationSubscription::ON_TRIAL_STATUS;
                } else {
                    $orgSubscription->status = OrganizationSubscription::ACTIVE_STATUS;
                    $orgSubscription->addon_start_date = Carbon::now();
                    $org->subscription_start_date = Carbon::now();
                }

                $org->save();

                $orgSubscription->save();


                /*--------------------------------------------------*/

                array_push($updatedItems, $request_ids[$key]);
                array_push($approvedUserObjects, $org->user);

                /*--------------------------------------------------*/
                /* create temp user and roles */
                /*--------------------------------------------------*/

                // attach role to user - site owner
                $userAccount->syncRoles(Role::whereIn('name', ['portal-org-admin'])->get());

                // attach branch admin access to owner
                // $userAccount->syncRoles(Role::whereName('org-admin')->first());

                // create temp user roles [ branch-admin, staff, parent ]
                $roleSeeder = new TempRolesForOrgAdminSeeder();
                $roleSeeder->run($org->id);

                /*--------------------------------------------------*/

                unset($org);
                unset($orgSubscription);
            }

            DB::commit();

            /*--------------------------------------------------*/
            /* all good -> (notifiable) -> send mail */
            /*--------------------------------------------------*/

            foreach ($approvedUserObjects as $key => $userObject) {
                //send subscription approve email
                $userObject->notify(new OnSubscriptionApproved(
                    PathHelper::getSiteManagerPath($request->fullUrl())
                ));
            }

            /*-----------------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
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

    /**
     * Sofe delete multiple organizations
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function deleteMultiple(Request $request)
    {
        DB::beginTransaction();

        try {

            $request_ids = $request->input('indexs');
            $ids = Helpers::decodeHashedID($request_ids);
            //$fourceDelete = ($request->input('forceDel') != '') ? filter_var($request->input('forceDel'), FILTER_VALIDATE_BOOLEAN) : false;
            $deletedItems = [];

            foreach ($ids as $key => $item) {

                $orgObj = Organization::withTrashed()->find($item);


                if (is_null($orgObj)) {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_404,
                            LocalizationHelper::getTranslatedText('system.resource_not_found')
                        ),
                        RequestType::CODE_404
                    );
                }

                if (!is_null($orgObj->deleted_at)) {
                    $orgObj->forceDelete();
                } else {
                    $orgObj->delete();
                }
                array_push($deletedItems, $request_ids[$key]);

                unset($orgObj);
            }


            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
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

    /**
     * Update Subscriber
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function edit_quotation(Request $request)
    {
        DB::beginTransaction();

        try {

            $id = Helpers::decodeHashedID($request->input('id'));
            $orgObj = Organization::withTrashed()->find($id);
            $orgObj->payment_frequency = $request->input('billingFrequency');
            $orgObj->subscription_cycle = $request->input('subscription');
            $orgObj->save();

            $subscriptionsArray = $request->input('subscriptions');


            foreach ($subscriptionsArray as $key => $item) {

                if ($item['type'] == 'old') {

                    $inputSId = $item['id'];
                    $subId = Helpers::decodeHashedID($inputSId);

                    // $id = Helpers::decodeHashedID($request->input('id'));
                    $orgSubscription = OrganizationSubscription::withTrashed()->find($subId);

                    if ($item['agreedPrice'] === null) {
                        $orgSubscription->price = $item['amount'];
                    } else {
                        $orgSubscription->price = $item['agreedPrice'];
                    }

                    $orgSubscription->unit_type =  $item['unitType'];
                    $orgSubscription->minimum_price =  $item['minimumPrice'];
                    $orgSubscription->save();
                } else if ($item['type'] == 'new') {

                    $addonId = Helpers::decodeHashedID($item['addonId']);
                    $addonData = Addon::find($addonId);
                    $orgSubscription = new OrganizationSubscription();

                    if ($item['agreedPrice'] === null) {
                        $orgSubscription->price = $item['amount'];
                    } else {
                        $orgSubscription->price = $item['agreedPrice'];
                    }
                    $orgSubscription->unit_type = $item['unitType'];
                    $orgSubscription->minimum_price =  $item['minimumPrice'];
                    $orgSubscription->addon_id = $addonId;
                    $orgSubscription->organization_id =  $orgObj->id;
                    $orgSubscription->plugin = $addonData->plugin;
                    $orgSubscription->addon_start_date = null;
                    $orgSubscription->trial_period = null;
                    $orgSubscription->status = OrganizationSubscription::INACTIVE_STATUS;
                    $orgSubscription->save();
                }
                // $orgSubscription->addon_start_date =  $date;

                // $orgSubscription->minimum_price =  $request->input('first_name');
                // $orgSubscription->trial_period = $addonData->trial_period; //null
                // $orgSubscription->status = OrganizationSubscription::ACTIVE_STATUS;

            }

            $ExistingQuotations = QuotationVerification::where('organization_id', $orgObj->id);
            if ($ExistingQuotations != null) {
                $ExistingQuotations->delete();
            }


            $quoteVerify = new QuotationVerification();
            $quoteVerify->organization_id = $orgObj->id;
            // $quoteVerify->user_id = $orgObj->user->id;
            $quoteVerify->token = Helpers::generateToken();
            $quoteVerify->expires_at = Carbon::now()->addDays((int) config('org-config.quote_token_expiry'));
            $quoteVerify->save();



            DB::commit();

            $updatedSubscriptions = OrganizationSubscription::where('organization_id', $orgObj->id)->get();

            /*-----------------------------------------------------------*/
            /* send email verification mail                             */
            /*---------------------------------------------------------*/

            $orgObj->notify(new SendQuotationVerification(
                PathHelper::getQuotationVerificationPath($request->fullUrl(), $quoteVerify->token),
                $quoteVerify,
                $updatedSubscriptions
            ));
            /*-----------------------------------------------*/
            /*----------------------------------------------*/


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    // new OrganizationSubscription($orgSubscription)
                    [
                        'success' => 'Added records',
                    ]
                ),
                RequestType::CODE_200
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

    /**
     * Approve the custom plan
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function approveCustom(Request $request)
    {
        DB::beginTransaction();

        try {
            $request_ids = $request->input('indexs');
            $ids = Helpers::decodeHashedID($request_ids);

            $updatedItems = [];
            $approvedUserObjects = [];

            foreach ($ids as $key => $item) {
                /*--------------------------------------------------*/
                /* update status for organization and user */
                /*--------------------------------------------------*/

                $org = Organization::find($item);
                /*if($org->current_plan->name != config('subscripton.plans.P1')) {
                    $org->trial_end_date = Carbon::now()->addDays(config('org-config.subscription_trial_days'))->format('Y-m-d');
                }
                $org->subscription_start_date = Carbon::now()->format('Y-m-d');*/

                if ($org->status === 'email_verification') {
                    $org->payment_status = StatusType::PAY_TRIAL;
                    $org->status = StatusType::QUOTATION_ACCEPT;
                    $org->save();

                    $userAccount = User::find($org->user->id);
                    $userAccount->email_verified = true;
                    $userAccount->status = '0';
                    $userAccount->save();
                } else {
                    continue;
                }

                /*--------------------------------------------------*/

                array_push($updatedItems, $request_ids[$key]);
                array_push($approvedUserObjects, $org->user);

                /*--------------------------------------------------*/
                /* create temp user and roles */
                /*--------------------------------------------------*/

                // attach role to user - site owner
                $userAccount->syncRoles(Role::whereName('portal-org-admin')->first());

                // attach branch admin access to owner
                //$userAccount->syncRoles(Role::whereName('org-admin')->first());

                // create temp user roles [ branch-admin, staff, parent ]
                $roleSeeder = new TempRolesForOrgAdminSeeder();
                $roleSeeder->run($org->id);

                /*--------------------------------------------------*/

                unset($org);
            }

            DB::commit();

            /*--------------------------------------------------*/
            /* all good -> (notifiable) -> send mail */
            /*--------------------------------------------------*/

            // this one is moved to the verify quotation

            // foreach ($approvedUserObjects as $key => $userObject) {
            //     //send subscription approve email
            //     $userObject->notify(new OnCustomSubscriptionApproved(
            //         PathHelper::getSiteManagerPath($request->fullUrl())
            //     ));
            // }

            /*-----------------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
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

    /**
     * Verify Subscription Email
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function verifyQuotationEmail(Request $request)
    {

        DB::beginTransaction();

        try {
            $obj = null;
            $token = $request->input('token');
            $status = false;
            $expired = false;
            $message = '';

            $obj = QuotationVerification::where('token', '=', $token)
                ->get()
                ->first();

            if ($obj != null && !$obj->isExpired()) {
                //update status
                $orgObj = Organization::find($obj->organization_id);
                $orgObj->status = StatusType::ACTIVE;
                $orgObj->email_verified = true;
                // $orgObj->save();

                $orgSubscription = OrganizationSubscription::where('organization_id', $orgObj->id)->get();

                foreach ($orgSubscription as $sub) {

                    if ($sub->trial_period) {
                        $sub->trial_start_date = Carbon::now();
                        $sub->trial_end_date = Carbon::now()->addDays($sub->trial_period);
                        $sub->status = OrganizationSubscription::ON_TRIAL_STATUS;
                    } else {
                        $sub->status = OrganizationSubscription::ACTIVE_STATUS;
                        $sub->addon_start_date = Carbon::now();
                        $orgObj->subscription_start_date = Carbon::now();
                    }

                    $sub->save();
                }

                /*-----------------------------------------------------------*/
                /* attach role to user - site owner */
                /*-----------------------------------------------------------*/
                $userAccount = User::find($orgObj->user->id);
                $userAccount->status = '0';
                $userAccount->save();

                //attach role to user - site owner
                $userAccount->syncRoles(Role::whereIn('name', ['org-admin-', 'portal-org-admin'])->get());

                 //create temp user roles [ branch-admin, staff, parent ]
                 $roleSeeder = new TempRolesForOrgAdminSeeder();
                 $roleSeeder->run($orgObj->id);

                /*-----------------------------------------------------------*/
                /* Email to admin */
                /*-----------------------------------------------------------*/
                $root_admins = User::PortalAdmin()->get();

                foreach ($root_admins as $r_user) {
                    $r_user->notify(new OnQuotationVerifiedAdmin($orgObj, PathHelper::getPortalPath($request->fullUrl())));
                }


                /*-----------------------------------------------------------*/
                /* quotation accepted email */
                /*-----------------------------------------------------------*/

                $orgObj->notify(new OnCustomSubscriptionApproved(
                    PathHelper::getSiteManagerPath($request->fullUrl())
                ));

                $orgObj->save();
                $obj->delete();

                DB::commit();

                $status = true;
                $message = LocalizationHelper::getTranslatedText('email_verification.email_verified');
            } else {
                if ($obj != null && $obj->isExpired()) {
                    $expired = true;
                    $message = LocalizationHelper::getTranslatedText('email_verification.link_expired');
                } else {
                    $status = null;
                    $message = LocalizationHelper::getTranslatedText('email_verification.invalid_uri');
                }
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
                ),
                RequestType::CODE_200
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

    /**
     * Get Quotation Info
     * @param Request $request
     * @return JsonResponse
     */
    public function getQuoteInfo(Request $request)
    {
        try {
            $id = Helpers::decodeHashedID($request->input('id'));
            // $id = $request->input('id');

            // this should be updated to get each subscription in the organization
            // $rowObj = OrganizationSubscription::where('organization_id', $id)->get()->first();
            $rowObj = OrganizationSubscription::with('addon')->where('organization_id', $id)->where('status', 'inactive')->get();
            // $validObj = $rowObj->where('status', 100)->get();

            if (is_null($rowObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return (new OrganizationSubscriptionResourceCollection($rowObj, ['getSubInfo' => true, 'withAddon' => true]))
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

    /**
     * Resend Quotation
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function resendQuotationEmail(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $token = $request->input('token');

            if (empty($token))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $acceptObj = QuotationVerification::where('token', '=', $token)->get()->first();

            if (!$acceptObj) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('auth.token_invalid')
                    ),
                    RequestType::CODE_400
                );
            }


            //  $acceptObj->expires_at = Carbon::now()->addDays((int) config('org-config.token_expiry'));
            //  $acceptObj->save();

            //  DB::commit();

            $orgObj = $acceptObj->organization;

            //  $userObj->notify(new SendCustPlanEmailVerification(
            //      PathHelper::getCustPlanEmailVerificationPath($request->fullUrl(), $acceptObj->token),
            //      $acceptObj
            //  ));


            $updatedSubscriptions = OrganizationSubscription::where('organization_id', $orgObj->id)->get();

            $orgObj->notify(new SendQuotationVerification(
                PathHelper::getQuotationVerificationPath($request->fullUrl(), $acceptObj->token),
                $acceptObj,
                $updatedSubscriptions
            ));

            return
                response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        ['organization' => $acceptObj->organization]
                    ),
                    RequestType::CODE_200
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

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getUserBranchLinks(Request $request)
    {
        try
        {
            $owner = $this->userRepo->findById(Helpers::decodeHashedID($request->input('user')), []);

            $accounts = $this->userRepo->findBranchUserBySubscriber(
                Helpers::decodeHashedID($request->input('org')),
                $owner->id,
                $owner->email,
                [],
                [ 'branch' ],
                false,
                false
            );

            unset($owner);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new UserResourceCollection($accounts, [ 'organization' => true ])
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function linkSubscriberBranchAccess(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(OrganizationBranchAccessRequest::class);

            // get subscriber account
            $org_user = $this->userRepo->findById(Helpers::decodeHashedID($request->input('user')), []);

            $org_user->site_manager = '1'; // set site manager value

            $list = $this->linkBranchesToSiteManager($org_user, $request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('organization.branch_access_linked'),
                    $list['action_is_new'] ? array_map(function ($item) { return $item['branch']['index']; }, $list['items']) : []
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
