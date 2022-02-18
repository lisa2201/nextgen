<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Organization;
use PaymentHelpers;
use RequestHelper;
use UserHelpers;

class OrganizationResource extends Resource
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
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource)) {
            return [];
        }

        if (array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->company_name
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->company_name,
                'email' => $this->email,
                'status' => $this->status,
                'cdate' => $this->created_at->toDateString(),
                'phone' => ($this->phone_number != null) ? (int) $this->phone_number : '',
                'paymentFrequency' => ($this->payment_frequency != null) ? $this->payment_frequency : '',
                'fax' => ($this->fax_number != null) ? (int) $this->fax_number : '',
                'address1' => ($this->address_1 != null) ? $this->address_1 : '',
                'address2' => ($this->address_2 != null) ? $this->address_2 : '',
                'zipcode' => ($this->zip_code != null) ? $this->zip_code : '',
                'city' => ($this->city != null) ? $this->city : '',
                'country' => ($this->country_code != null) ? $this->country_code : '',
                'state' => ($this->state != null) ? $this->state : '',
                'timezone' => $this->timezone,
                'sdelete' => ($this->deleted_at == null) ? false : true,
                'verified_email' => $this->email_verified,
                'tax_percentage' => $this->tax_percentage,
                'subscription'=> $this->subscription_cycle,
                'organization_code'=> $this->organization_code,

                //hard coded for custom plan approve
                'standard'=> !$this->subscriptions->first()->custom
            ];
        }

        if (array_key_exists("withBranch", $this->params) && $this->params['withBranch'])
        {
            $prop['branch'] = new BranchResourceCollection($this->whenLoaded('branch'));
        }

        if (array_key_exists("withUser", $this->params) && $this->params['withUser'])
        {
            $prop['user'] = new UserResource($this->whenLoaded('user'), [ 'short' => true ]);
        }

        if (array_key_exists("showPlan", $this->params) && $this->params['showPlan'])
        {
            $prop = PaymentHelpers::attachPlanDetailsOnly($this->resource, $prop);
        }

        if (array_key_exists("showPlanPrice", $this->params) && $this->params['showPlanPrice'])
        {
            $prop = PaymentHelpers::attachPlanWithPrice($this->resource, $prop);
        }

        if (array_key_exists("getPaymentInfo_Root", $this->params) && $this->params['getPaymentInfo_Root'])
        {
            $prop = PaymentHelpers::attachPaymentDetailsForRoot($this->resource, $prop);
        }

        if (array_key_exists("getPaymentInfo", $this->params) && $this->params['getPaymentInfo'] && auth()->user()->isOwner())
        {
            $prop = PaymentHelpers::attachPaymentDetailsForOwner($this->resource, $prop);
        }

        if (array_key_exists("includeCard", $this->params) && $this->params['includeCard'])
        {
            $prop['cards'] = new CreditCardResource($this->whenLoaded('cards'), []);
        }

        if (array_key_exists("getSubInfo", $this->params) && $this->params['getSubInfo'])
        {
            $prop['no_of_branches'] = $this->no_of_branches;
            $prop['first_name'] = $this->first_name;
            $prop['last_name'] = $this->last_name;
            $prop['branch'] = $this->branch;
            $prop['user'] = $this->user;
        }

        return $prop;
    }
}
