<?php

namespace Kinderm8\Http\Resources;

use Log;
use DateTimeHelper;
use WaitlistHelper;
use Illuminate\Http\Resources\Json\JsonResource;


class EnquiryResource extends JsonResource
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
            'org_id' => $this->organizationIndex,
            'branch_id' => $this->branchIndex,
            'branch_name' => $this->branch->name,
            'waitlist_info' => isset($this->enquiry_info['section_inputs']['enquiry']) ? $this->enquiry_info : WaitlistHelper::codeForOlderWaitlistInfoGenarate($this->enquiry_info, $this->organization_id, $this->branch_id, ($this->status == 0) ? 5 : 6, true),
            'status' => ($this->status == 0) ? 5 : 6,
            'application_date' => $this->number_of_days,
            'submitted_date' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at)->toDateString() : '',
        ];
        return $prop;
    }
}
