<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentPaymentProviderResource extends JsonResource
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
            "payment_type" => $this->payment_type,
            "configuration" => $this->configurations,
            "status" => $this->status === '0' ? true : false,
            "created_at" => $this->created_at,
            "updated_at" => $this->updated_at
        ];

        return $prop;
    }
}
