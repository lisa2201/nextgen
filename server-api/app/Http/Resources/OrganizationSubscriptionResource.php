<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\Resource;
use StaticUrls;

class OrganizationSubscriptionResource extends Resource
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
        if (is_null($this->resource))
        {
            return [];
        }

        $prop = [
            'id' => $this->index,
            'organization_id' => $this->organization_id,
            'addon_id' => $this->addon_id,
            'title' => $this->title,
            'description' => $this->description,
            'price' => $this->price,
            'unit_type' => $this->unit_type,
            'minimum_price' => $this->minimum_price,
            'trial_period' => $this->trial_period,
            'trial_end_date' => $this->trial_end_date,
            'addon_start_date' => $this->addon_start_date,
            'addon_end_date' => $this->addon_end_date,
            'properties' => $this->properties,
            'status' => $this->status
        ];

        if(array_key_exists('withAddon', $this->params) && ($this->params['withAddon'] === true)) {
            $prop['addon'] = new AddonResource($this->whenLoaded('addon'));
        }

        return $prop;
    }
}
