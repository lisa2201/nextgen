<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Enums\CCSType;

class SessionSubmissionResource extends Resource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @param array $params
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
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        return [
            'id' => $this->index,
            'start' => $this->session_start_date,
            'end' => $this->session_end_date,
            'report_date' => $this->session_report_date,
            'type' => CCSType::SESSION_SUBMISSION_ACTION[$this->action],
            'status' => [
                'code' => $this->status,
                'label' => $this->is_withdrawal_processed ? CCSType::SESSION_REPORT_STATUS[array_keys(CCSType::SESSION_REPORT_STATUS)[10]] : CCSType::SESSION_REPORT_STATUS[$this->status]
            ],
            'status_history' => $this->status_history,
            'sync_status' => $this->is_synced,
            'sync_error' => Helpers::uniqueMulti($this->syncerror),
            'sessions' => $this->sessions,
            'process_type' => $this->submission_type,
            'no_care' => $this->no_care_provided,
            'resubmitted_on' => !is_null($this->resubmitted_on) ? DateTimeHelper::getTimezoneDatetime($this->resubmitted_on, auth()->user()->timezone)->toDateTimeString() : null,
            'is_withdrawn' => $this->is_withdrawal_processed,

            'enrolment' => new CCSEnrolmentResource($this->whenLoaded('enrolment')),
            'child' => new ChildResource($this->whenLoaded('child'), [ 'basic' => true ]),
            'creator' => new UserResource($this->whenLoaded('creator'), [ 'short' => true ]),
        ];
    }
}
