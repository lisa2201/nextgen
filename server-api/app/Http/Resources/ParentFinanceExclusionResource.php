<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentFinanceExclusionResource extends JsonResource
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
            "organization" => new OrganizationResource($this->whenLoaded('organization')),
            "branch" => new BranchResource($this->whenLoaded('branch')),
            "start_date" => $this->start_date,
            "end_date" => $this->end_date,
            "ccs_payment" => $this->ccs_payment,
            "parent_payment" => $this->parent_payment,
            "booking_fee" => $this->fee,
            "parent" => new UserResource($this->whenLoaded('parent'), ['basic' => true])
        ];

        return $prop;
    }
}
