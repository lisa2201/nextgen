<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentPayementScheduleResource extends JsonResource
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
            "organization" => $this->whenLoaded('organization'),
            "branch" => $this->whenLoaded('branch'),
            "parent" => new UserResource($this->whenLoaded('parent'), ['basic' => true]),
            "created_by" => new UserResource($this->whenLoaded('createdBy'), ['basic' => true]),
            "payment_frequency" => $this->payment_frequency,
            "billing_term" => $this->billing_term,
            "payment_day" => $this->payment_day,
            "activation_date" => $this->activation_date,
            "fixed_amount" => $this->fixed_amount,
            "amount_limit" => $this->amount_limit,
            "last_payment_date" => $this->last_payment_date,
            "next_generation_date" => $this->next_generation_date,
            "last_generation_date" => $this->last_generation_date,
            "status" => $this->status,
            "created_at" => $this->created_at,
            "auto_charge" => $this->auto_charge,
            "updated_at" => $this->updated_at,
            "history" => $this->edit_history
        ];

        return $prop;
    }
}
