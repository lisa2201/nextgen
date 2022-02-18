<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class ParentPaymentBalanceAdjustmentResource extends Resource
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
        if (is_null($this->resource)) {
            return [];
        }

        $prop = [
            "id" => $this->id,
            "type" => $this->adjustment_type,
            "amount" => $this->open_balance,
            "description" => $this->description,
            "date" => $this->date,
            "user" => new UserResource($this->whenLoaded('parent'), ['basic' => true]),
            "created_at" => $this->created_at
        ];

        return $prop;
    }
}
