<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\Resource;

class AlternativePaymentResource extends Resource
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
            'id' => $this->index,
            'organization_id' => $this->organization_id,
            'properties' => $this->properties,
            'alternativePaymentArrangementID' => $this->alternativePaymentArrangementID,
            'created_by' => $this->created_id,
            'is_synced' => $this->is_synced,
            'error' => $this->syncerror,
            'cancelReturnFeeReductionReason' => $this->cancelReturnFeeReductionReason,
            'provider' => new ProviderSetupResource($this->whenLoaded('provider'))
        ];

        return $prop;
    }
}
