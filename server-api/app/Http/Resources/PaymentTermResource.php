<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PaymentTermResource extends JsonResource
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
            "name" => $this->name,
            "start_date" => $this->start_date,
            "end_date" => $this->end_date,
            "transaction_generation_date" => $this->transaction_generation_date,
            "payment_generation_date" => $this->payment_generation_date,
            "status" => $this->status === '0' ? true : false,
            "created_by" => new UserResource($this->whenLoaded('createdBy'), ['basic' => true])
        ];

        return $prop;
    }
}
