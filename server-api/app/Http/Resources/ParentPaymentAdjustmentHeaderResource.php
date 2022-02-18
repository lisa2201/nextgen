<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentPaymentAdjustmentHeaderResource extends JsonResource
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
            "start_date" => $this->start_date,
            "end_date" => $this->end_date,
            "type" => $this->type,
            "amount" => $this->amount,
            "comments" => $this->comments,
            "organization" => new OrganizationResource($this->whenLoaded('organization')),
            "item" => new AdjustmentItemResource($this->whenLoaded('item')),
            "branch" => new BranchResource($this->whenLoaded('branch')),
            "details" => new ParentPaymentAdjustmentResourceCollection($this->whenLoaded('details')),
            "scheduled" => $this->scheduled,
            "executed" => $this->executed,
            "created_at" => $this->created_at,
            "reversed" => $this->reversed,
            "properties" => $this->properties
        ];

        return $prop;
    }
}
