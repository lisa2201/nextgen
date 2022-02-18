<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\PaymentInformations;
use NavigationHelper;
use RoleHelpers;

class UserResource extends Resource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @param array $params
     */
    public function __construct($resource, $params = [])
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        if(array_key_exists('isAuth', $this->params) && $this->params['isAuth'])
        {
            $permsArray = $this->getCurrentRoleUserPermissions();

            $prop = [
                'id' => $this->index,
                'image' => $this->image,
                'name' => rtrim($this->first_name . ' ' . $this->last_name),
                'email' => $this->email,
                'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'status' => ($this->status == '0') ? true : false,

                'permissions' => $permsArray['perms_list'],
                'role' => $this->role_types,
                'level' => $this->attachAuthRoleGroup(),
                'site_manager' => $this->hasOwnerAccess(),
                'navigators' => NavigationHelper::getNavigations($permsArray['perms_access_list'], auth()->user())
            ];

            if(auth()->user()->isAdministrative())
            {
                $prop['has_admin_rights'] = $permsArray['is_admin'];
            }

            if(auth()->user()->hasOwnerAccess() || auth()->user()->isBranchUser())
            {
                $prop['has_payment_method'] = PaymentInformations::where('organization_id', $this->organization_id)->where('status', '0')->count() === 0 ? false : true;
            }
        }
        else if(array_key_exists('short', $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => $this->email,
                'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
            ];
        }
        else if(array_key_exists('passwordSetup', $this->params) && $this->params['passwordSetup'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'email' => $this->email,
                'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, (!isset($this->timezone)) ? 'Australia/NSW' : $this->timezone)->toDateString() : '',
                'date' => $this->invitation_date,
                'is_expire_invitation' => $this->isExpired(),
                'login_access' => ($this->login_access == '0') ? true : false
            ];
        }
        else if(array_key_exists('basic', $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => $this->email,
                'phone' => ($this->phone != null) ? $this->phone : '',
                'phone2' => ($this->phone2 != null) ? $this->phone2 : '',
                'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'role_group' => $this->roleGroup,
                'roles' => $this->roles,
                'ccs_id' => $this->ccs_id,
                'status' => ($this->status == '0') ? true : false,
                'login_access' => ($this->login_access == '0') ? true : false,
                'attendance' => $this->attendance,
            ];
        }
        else if(array_key_exists('profile', $this->params) && $this->params['profile'])
        {
            $prop = [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => $this->email,
                'need_sec_email'  => ($this->need_sec_email == '1') ? true : false,
                'secondary_email' => ($this->second_email != null) ? $this->second_email : '',

                'phone' => ($this->phone != null) ? $this->phone : '',
                'phone2' => ($this->phone2 != null) ? $this->phone2 : '',
                'address1' =>  ($this->address_1 != null) ? $this->address_1 : '',
                'address2' =>  ($this->address_2 != null) ? $this->address_2 : '',
                'city' =>  ($this->city != null) ? $this->city : '',
                'zip_code' =>  ($this->zip_code != null) ? (int) $this->zip_code : '',
                'country' => ($this->country_code != null) ? $this->country_code : '',
                'state' => ($this->state != null) ? $this->state : '',

                'ccs_id' => $this->ccs_id,

                'status' => ($this->status == '0') ? true : false,
                'has_admin_rights' => $this->hasAdminRights(),
                'role_group' => $this->roleGroup,
                'roles' => $this->roles,
                'email_types' => $this->emailTypes,
                'login_access' => ($this->login_access == '0') ? true : false,
                'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'work_phone' => $this->work_phone,
                'work_mobile' => $this->work_mobile,
                'attendance' => $this->attendance,
            ];
        }
        else if(array_key_exists('invitation', $this->params) && $this->params['invitation'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'dob' => is_null($this->dob) ? '' : $this->dob,
            ];
        }
        else if(array_key_exists('financeAccounts', $this->params) && $this->params['financeAccounts'])
        {

            $prop =  [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'balance' => $this->running_total,
                'payment_methods' => new ParentPaymentMethodResourceCollection($this->whenLoaded('parentPaymentMethods')),
                'payment_schedules' => new ParentPayementScheduleResourceCollection($this->whenLoaded('paymentSchedules')),
                'bond' => new BondPaymentResourceCollection($this->whenLoaded('bond'))
            ];
        }
        else if(array_key_exists('financeAccountsReport', $this->params) && $this->params['financeAccountsReport'])
        {
            $balance = 0;

            if(count($this->transactions) > 0)
            {
                $transactions = $this->transactions;
                $balance = $transactions[0]['running_total'];
            }

            $last_payment_date = $this->parentPayments->where('status', 'completed')->last();

            $prop =  [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'balance' => $balance,
                'email' => $this->email,
                'phone' => ($this->phone != null) ? $this->phone : '',
                // 'last_payment_date' => $last_payment_date ? $last_payment_date->date : null,
                // 'payment_method_configured' => $this->parentPaymentMethods->count() > 0 ? true : false,
                // 'payment_schedules_configured' => $this->paymentSchedules->count() > 0 ? true : false,
                'payment_methods' => $this->whenLoaded('parentPaymentMethods', new ParentPaymentMethodResourceCollection($this->parentPaymentMethods)),
                'payment_schedules' => $this->whenLoaded('paymentSchedules', new ParentPayementScheduleResourceCollection($this->paymentSchedules)),
                'children_etails' => $this->getChildDetails($this->whenLoaded('child', new ChildResourceCollection($this->child, ['basic' => true]))),
                'transaction' =>$this->transactions
            ];

            if(array_key_exists('FIN_WRSR', $this->params) && $this->params['FIN_WRSR']) {
                $prop['week_ending'] = $this->params['weekEnding'];
                $prop['week_starting'] = $this->params['weekStarting'];
                $prop['ccs_payment'] = $this->params['ccsPayment'];

            }
        }
        else if(array_key_exists('organization', $this->params) && $this->params['organization'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'branch' => [
                    'id' => $this->whenLoaded('branch') ? $this->branch->index : null,
                    'name' => $this->whenLoaded('branch') ? $this->branch->name : null
                ],
            ];
        }
        else if(array_key_exists('enrolmentImport', $this->params) && $this->params['enrolmentImport'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'dob' => is_null($this->dob) ? '' : $this->dob,
                'ccs_id' => $this->ccs_id,
            ];
        }
        else
        {
            $permsArray = $this->getCurrentRoleUserPermissions();

            $prop =  [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => $this->email,
                'need_sec_email'  => ($this->need_sec_email == '1') ? true : false,
                'secondary_email' => ($this->second_email != null) ? $this->second_email : '',

                'phone' => ($this->phone != null) ? $this->phone : '',
                'phone2' => ($this->phone2 != null) ? $this->phone2 : '',
                'address1' =>  ($this->address_1 != null) ? $this->address_1 : '',
                'address2' =>  ($this->address_2 != null) ? $this->address_2 : '',
                'city' =>  ($this->city != null) ? $this->city : '',
                'zip_code' =>  ($this->zip_code != null) ? (int) $this->zip_code : '',

                'roles' => $this->user_type,
                'role_group' => $this->roleGroup,

                'branch' => [
                    'id' => is_null($this->branch) ? null : $this->branch->index,
                    'name' =>is_null($this->branch) ? null : $this->branch->name
                ],
                'org' => [
                    'id' => $this->organization->index,
                    'name' => $this->organization->company_name
                ],

                'verified_email' => $this->email_verified,
                'status' => ($this->status == '0') ? true : false,
                'login_access' => ($this->login_access == '0') ? true : false,

                'sdelete' => ($this->deleted_at == null) ? false : true,
                'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',

                'has_admin_rights' => $this->hasAdminRights(),
                'permissions' => $permsArray['perms_list'],
                'ccs_id' => $this->ccs_id,
                'pincode' => $this->pincode,
                'kiosk_setup' => $this->kiosk_setup,
                'country' => $this->country_code,
                'state' => $this->state,
                'rooms' => $this->whenLoaded('rooms', new RoomResourceCollection($this->rooms)),
                'work_phone' => $this->work_phone,
                'work_mobile' => $this->work_mobile,
                'attendance' => $this->attendance,
            ];
        }

        if (array_key_exists('withPrimaryPayer', $this->params) && $this->params['withPrimaryPayer'])
        {
            $prop['primary_payer'] = $this->pivot->primary_payer;
            $prop['pivot_updated_at'] = $this->pivot->updated_at;
        }

        $prop['child'] = new ChildResourceCollection($this->whenLoaded('child'), [ 'basic' => true ]);

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @param  Request  $request
     * @return array
     */
    public function with($request)
    {
        $prop = [];

        /*if(array_key_exists("isAuth", $this->params) && $this->params['isAuth'])
        {
            $prop = [
                'token' => 'token_here'
            ];
        }*/

        return $prop;
    }

    /**
     * get role type
     *
     * @return array
     */
    function attachAuthRoleGroup()
    {
        $rolesTypes = $this->roles->pluck('type')->toArray();

        return RoleHelpers::getRoleLevels($rolesTypes);
    }

    /**
     * get user permission list
     *
     * @return array
     */
    function getCurrentRoleUserPermissions()
    {
        $perms_list = null;
        $perms_access_list = [];
        $has_admin_rights = false;

        foreach ($this->roles as $role)
        {
            if ($role->is_admin === '1') $has_admin_rights = true;

            $temp = [];

            foreach ($role->permissions->groupBy('type') as $key => $perms)
            {
                $navRef = array_unique($perms->pluck('navigation_ref_id')->toArray())[0];

                $temp[$navRef] = $perms->pluck('perm_slug')->toArray();

                array_push($perms_access_list, $navRef);
            }

            if(!empty($perms_list))
            {
                $perms_list = Helpers::arrayDeepMerge($perms_list, $temp);
            }
            else
            {
                $perms_list = $temp;
            }

            unset($temp);
        }

        return [
            'is_admin' => $has_admin_rights,
            'perms_list' => $perms_list,
            'perms_access_list' => $perms_access_list
        ];
    }

    /**
     * @param $children
     * @return string
     */
    function getChildDetails($children)
    {

        $child_array = [];
        foreach($children as $child) {

            // if($child['status']==='1') {
            //     $status = ' [Active]';
            // }
            // else if($child['status']==='0'){
            //     $status = ' [Inactive]';
            // }
            // else {
            //     $status = ' [Waitlist]';
            // }

            array_push($child_array, $child['first_name'] ? $child['first_name'] : '' );

            }

         return $str_Names=implode(" | ", $child_array);
    }
}
