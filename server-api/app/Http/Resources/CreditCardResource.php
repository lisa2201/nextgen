<?php

namespace Kinderm8\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\Resource;

class CreditCardResource extends Resource
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

        return [
            'id' => $this->index,
            'type' => $this->card_type,
            'number' => $this->card_number,
            'cvv' => decrypt($this->card_cvv),
            'exmonth' => $this->card_expiry_month,
            'exyear' => (int) Carbon::now()->year($this->card_expiry_year)->format('y')
        ];
    }
}
