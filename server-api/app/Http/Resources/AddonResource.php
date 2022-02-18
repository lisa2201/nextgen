<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\Resource;
use StaticUrls;

class AddonResource extends Resource
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
            'title' => $this->title,
            'description' => $this->description,
            'custom' => $this->custom,
            'imageUrl' => $this->imageUrl,
            'price' => (int) $this->price,
            'split_pricing' => $this->split_pricing,
            'properties' => $this->properties ? json_decode($this->properties) : null,
            'trial_period' => $this->trial_period ? (int) $this->trial_period : null,
            'plugin' => $this->plugin,
            'country' => $this->country,
            'unit_type' => $this->unit_type,
            'minimum_price' => $this->minimum_price
        ];

        return $prop;
    }


}
