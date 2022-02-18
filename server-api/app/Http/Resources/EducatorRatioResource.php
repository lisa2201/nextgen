<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EducatorRatioResource extends JsonResource
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
     * @param  Request  $request
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
            'state' => $this->state,
            'age_group' => $this->age_group,
            'age_start' => $this->age_start,
            'age_end' => $this->age_end,
            'ratio_display' => $this->ratio_display,
            'ratio_decimal' => $this->ratio_decimal
        ];


        return $prop;
    }
}
