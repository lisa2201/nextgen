<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class ParentPaymentAdjustmentResource extends Resource
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
            "id" => $this->index,
            "date" => $this->date,
            "item" => new AdjustmentItemResource($this->whenLoaded('item')),
            "child" => new ChildResource($this->whenLoaded('child'), ['basic' => true]),
            "scheduled" => $this->scheduled,
            "executed" => $this->executed,
            "created_at" => $this->created_at
        ];

        return $prop;
    }
}
