<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\JsonResource;

class ParentPaymentTransactionResource extends JsonResource
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
            "transaction_type" => $this->transaction_type,
            "ref_id" => Helpers::hxCode($this->ref_id),
            "mode" => $this->mode,
            "amount" => $this->amount,
            "running_total" => $this->running_total,
            "description" => $this->description,
            "parent" => new UserResource($this->whenLoaded('parent'), ['profile' => true]),
            "child" => new ChildResource($this->whenLoaded('child'), ['basic' => true]),
            "organization" => new OrganizationResource($this->whenLoaded('organization')),
            "branch" => new BranchResource($this->whenLoaded('branch'), ['basic' => true]),
            "reversed" => $this->reversed,
            "created_at" => $this->created_at
        ];

        if(array_key_exists('financeStatementData', $this->params) && $this->params['financeStatementData'])
        {
            $prop['item_name'] = isset($this->item_name) ? $this->item_name : '';
            $prop['session_start'] = isset($this->session_start) ? $this->session_start : '';
            $prop['session_end'] = isset($this->session_end) ? $this->session_end : '';
            $prop['room_name'] = isset($this->room_name) ? $this->room_name : '';
            $prop['adjustment_properties'] = isset($this->adjustment_properties) && !is_null($this->adjustment_properties) ? json_decode($this->adjustment_properties, true) : '';
            $prop['adjustment_start_date'] = isset($this->adjustment_start_date) ? $this->adjustment_start_date : '';
            $prop['adjustment_end_date'] = isset($this->adjustment_end_date) ? $this->adjustment_end_date : '';
        }

        return $prop;
    }


}
