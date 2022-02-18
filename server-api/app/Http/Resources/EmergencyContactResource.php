<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Helpers;
use Illuminate\Http\Resources\Json\JsonResource;
use Kinderm8\User;

class EmergencyContactResource extends JsonResource
{

    private $params;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
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
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        // $prop = [
        //     'id' => $this->id,
        //     'user_id' => ($this->user_id) ? Helpers::hxCode($this->user_id): '',
        //     'user' => $this->user,
        //     'child_profile_id' => $this->child_profile_id,
        //     'first_name' => $this->first_name,
        //     'last_name' => $this->last_name,
        //     'email' => ($this->email != 'noreply@kinderm8.com.au') ? $this->email : '',
        //     'phone' => $this->phone,
        //     'phone2' => $this->phone2,
        //     'address' => $this->address,
        //     'relationship' => $this->relationship,
        //     'types' => $this->types,
        //     'consents' => $this->consents,
        //     'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
        // ];

        if(array_key_exists('mobile_api', $this->params) && $this->params['mobile_api']){

            $prop =  [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => ($this->email != 'noreply@kinderm8.com.au') ? $this->email : '',
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
                'verified_email' => $this->email_verified,
                'status' => ($this->status == '0') ? true : false,
                'login_access' => ($this->login_access == '0') ? true : false,
                'sdelete' => ($this->deleted_at == null) ? false : true,
                'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'pincode' => $this->pincode,
                'call_order' => $this->pivot->call_order,
                'country' => $this->country_code,
                'state' => $this->state,
                'relationship' => $this->pivot->relationship,
                'types' => $this->pivot->types,
                'consents' => $this->pivot->consents,
                'child' => $this->pivot->child,
            ];

        }
        else{

            $prop =  [
                'id' => $this->index,
                'image' => $this->image,
                'first_name' => $this->first_name,
                'last_name' =>  $this->last_name,
                'dob' => is_null($this->dob) ? '' : DateTimeHelper::getDateFormat($this->dob),
                'email' => ($this->email != 'noreply@kinderm8.com.au') ? $this->email : '',
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
                'verified_email' => $this->email_verified,
                'status' => ($this->status == '0') ? true : false,
                'login_access' => ($this->login_access == '0') ? true : false,
                'sdelete' => ($this->deleted_at == null) ? false : true,
                'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'pincode' => $this->pincode,
                'call_order' => $this->pivot->call_order,
                'country' => $this->country_code,
                'state' => $this->state,
                'relationship' => $this->pivot->relationship,
                'types' => $this->pivot->types,
                'consents' => $this->pivot->consents,
                'child' => new ChildResource($this->pivot->child,[ 'short' => true ]),
            ];

        }



        return $prop;
    }
}
