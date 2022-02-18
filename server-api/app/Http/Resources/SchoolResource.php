<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use PathHelper;
use StaticUrls;

class SchoolResource extends Resource
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

        else if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'school_name' => $this->school_name,
                'school_address' => $this->school_address,
                'bus' => $this->whenLoaded('bus', new BusResourceCollection($this->bus, ['basic' => true])),
            ];

        }
        else
            {
            $prop = [
                'id' => $this->index,
                'school_name' => $this->school_name,
                'school_address' => $this->school_address
            ];
        }

        return $prop;
    }
}
