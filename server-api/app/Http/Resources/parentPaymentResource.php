<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\Resource;
use StaticUrls;

class ParentPaymentResource extends Resource
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
            'organization' => new BranchResource($this->whenLoaded('organization')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'parent' => new UserResource($this->whenLoaded('parent'), ['basic' => true]),
            'payment_method' => new ParentPaymentMethodResource($this->whenLoaded('paymentMethod')),
            'children' => $this->whenLoaded('parent', new ChildResourceCollection($this->parent->child, ['basic' => true])),
            'payment_ref' => $this->payment_ref,
            'transaction_ref' => $this->transaction_ref,
            'amount_due' => 0,
            'amount' => $this->amount,
            'date' => $this->date,
            'settlement_date' => $this->settlement_date,
            'payment_execution_type' => $this->payment_execution_type,
            'payment_generation_type' => $this->payment_generation_type,
            'manual_payment_type' => $this->manual_payment_type,
            'fail_reason' => $this->fail_reason,
            'comments' => $this->comments,
            'status' => $this->status,
            'created_at' => $this->created_at
        ];

        return $prop;
    }
}
