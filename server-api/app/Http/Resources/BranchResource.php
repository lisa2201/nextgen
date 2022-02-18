<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use PathHelper;
use StaticUrls;

class BranchResource extends Resource
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
        if (is_null($this->resource))
        {
            return [];
        }

        if(array_key_exists("short", $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->name,
                'url' => PathHelper::getBranchUrls($request->fullUrl(), $this)
            ];
        }
        else if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'email' => $this->email,
                'name' => $this->name,
                'desc' => ($this->description != null) ? $this->description : '',
                'org_name' => $this->whenLoaded('organization') ? $this->organization->company_name : '',
                'org' => $this->org_id,
                'phone' => ($this->phone_number != null) ? (int)$this->phone_number : '',
                'fax' => ($this->fax_number != null) ? (int)$this->fax_number : '',
                'address1' => ($this->address_1 != null) ? $this->address_1 : '',
                'address2' => ($this->address_2 != null) ? $this->address_2 : '',
                'zipcode' => ($this->zip_code != null) ? (int)$this->zip_code : '',
                'city' => ($this->city != null) ? $this->city : '',
                'country' => ($this->country_code != null) ? $this->country_code : '',
                'currency' => $this->org_currency,
                'status' => ($this->status === '0') ? true : false,
                'tz' => $this->timezone,
                'pc' => $this->pincode,
                'media' => [
                    'logo' => $this->logo,
                    'cover' => $this->cover
                ],
                'center_settings' => $this->center_settings,
                'has_kinder_connect' => $this->kinderconnect,
                'branch_logo' => $this->branch_logo,
                'new_advanced_payment' => $this->new_advanced_payment
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'attr_id' => Helpers::generateSerialCode(),
                'domain' => $this->subdomain_name,
                'email' => $this->email,
                'name' => $this->name,
                'desc' => ($this->description != null) ? $this->description : '',
                'org_name' => $this->whenLoaded('organization') ? $this->organization->company_name : '',
                'org' => $this->org_id,
                'phone' => ($this->phone_number != null) ? (int)$this->phone_number : '',
                'fax' => ($this->fax_number != null) ? (int)$this->fax_number : '',
                'address1' => ($this->address_1 != null) ? $this->address_1 : '',
                'address2' => ($this->address_2 != null) ? $this->address_2 : '',
                'zipcode' => ($this->zip_code != null) ? (int)$this->zip_code : '',
                'city' => ($this->city != null) ? $this->city : '',
                'country' => ($this->country_code != null) ? $this->country_code : '',
                'currency' => $this->org_currency,
                'status' => ($this->status === '0') ? true : false,
                'cdate' => $this->created_at->toDateString(),
                'sdelete' => ($this->deleted_at == null) ? false : true,
                'tz' => $this->timezone,
                'pincode' => $this->pincode,
                'media' => [
                    'logo' => $this->logo,
                    'cover' => $this->cover
                ],
                'service' => ($this->service_id !== '') ? new ServiceSetupResource($this->whenLoaded('providerService')) : null,
                'opening_hours' => $this->opening_hours,
                'has_kinder_connect' => $this->kinderconnect,
                'link' => PathHelper::getBranchUrls($request->fullUrl(), $this),
                'branch_logo' => $this->branch_logo,
                'start_date' => $this->start_date
            ];
        }

        if(array_key_exists("includeOrg", $this->params) && $this->params['includeOrg'])
        {
            $prop['organization'] = new OrganizationResource($this->whenLoaded('organization'));
        }

        return $prop;
    }
}
