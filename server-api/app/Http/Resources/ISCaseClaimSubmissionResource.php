<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ISCaseClaimSubmissionResource extends JsonResource
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
            "case_id" => $this->case_id,
            "transaction_id" => $this->transaction_id,
            "case_claim_reference" => $this->case_claim_reference,
            "hours_claimed" => $this->hours_claimed,
            "payment_type" => $this->payment_type,
            "service_provision" => $this->service_provision,
            "week_ending" => $this->week_ending,
            "is_case" => $this->is_case,
            "enrolments" => $this->enrolments,
            "week_days" => $this->week_days,
            "fail_reason" => $this->fail_reason,
            "status" => $this->status,
            "created_at" => $this->created_at
        ];

        return $prop;
    }
}
