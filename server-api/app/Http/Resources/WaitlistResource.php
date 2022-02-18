<?php

namespace Kinderm8\Http\Resources;

use Log;
use WaitlistHelper;
use Illuminate\Http\Resources\Json\JsonResource;
use Helpers;

class WaitlistResource extends JsonResource
{

    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @return void
     */
    public function __construct($resource, $params = [])
    {

        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    public function toArray($request)
    {

        $prop = [
            'id' => $this->index,
            'org_id' => Helpers::hxCode($this->organization_id),
            'branch_id' => Helpers::hxCode($this->branch_id),
            'branch_name' => $this->branch->name,
            'waitlist_info' => isset($this->waitlist_info['section_inputs']) ? $this->waitlist_info : WaitlistHelper::codeForOlderWaitlistInfoGenarate($this->waitlist_info, $this->organization_id, $this->branch_id, $this->status, true),
            'status' => $this->status,
            'application_date' => $this->number_of_days,
            'submitted_date' => $this->created_at
        ];
        return $prop;
    }


}
