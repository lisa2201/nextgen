<?php

namespace Kinderm8\Http\Resources;

use CCSHelpers;
use DateTimeHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Kinderm8\Enums\CCSType;

class CCSEnrolmentResource extends JsonResource
{
    private $params;

    /**
     * Transform the resource into an array.
     *
     * @param $resource
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

        $prop = [
            'id' => $this->index,
            'enrol_id' => $this->enrolment_id,
            'child' => new ChildResource($this->whenLoaded('child'), [ 'enrolmentImport' => true ]),
            'individual' => new UserResource($this->whenLoaded('parent'), [ 'basic' => true ]),
            'status' => [
                'code' => $this->status,
                'label' => CCSType::CCS_STATUS_MAP[$this->status]
            ],
            'enrol_start' => DateTimeHelper::getDateFormat($this->enrollment_start_date),
            'arrangement' => [
                'code' => $this->arrangement_type,
                'label' => CCSType::ENROLMENT_ARRANGEMENT_TYPE[$this->arrangement_type],
                'pea_reason' => [
                    'code' => $this->reason_for_pea,
                    'label' => CCSType::ENROLMENT_PEA_REASON[$this->reason_for_pea]
                ]
            ],
            'session' => [
                'code' => $this->session_type,
                'label' => CCSType::ENROLMENT_SESSION_TYPE[$this->session_type],
                'routine' => $this->mapSessionRoutine($this->session_routine)
            ],
            'initial_session' => $this->initial_session_routine,
            'enrol_end' => !is_null($this->enrollment_end_date) ? DateTimeHelper::getDateFormat($this->enrollment_end_date) : '',
            'week_cycle' => (! Helpers::IsNullOrEmpty($this->number_weeks_cycle)) ? $this->number_weeks_cycle : null,
            'late_submission' => $this->late_submission_reason,
            'arrangement_note' => $this->arrangement_type_note,
            'session_state' => $this->session_type_state,
            'signing' => $this->signing_party,
            'signing_first' => $this->signing_party_individual_first_name,
            'signing_last' => $this->signing_party_individual_last_name,
            'case_details' => $this->is_case_details,
            'note' => $this->notes,
            'parent_approved_status' => $this->parent_status,
            'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
            //
            'change_log' => $this->status_history,
            'ccs_history' => array_key_exists('includeStatusHistory', $this->params) ? $this->params['includeStatusHistory'] : [],
            //
            'sync_status' => $this->is_synced,
            'sync_error' => Helpers::uniqueMulti($this->syncerror),
            'parent_approved' => $this->parent_status !== '0' ? ($this->parent_status === '2') : true,
        ];

        return $prop;
    }

    /**
     * session routine map
     * @param $session
     * @return array
     */
    function mapSessionRoutine($session)
    {
        $casual = null;
        $routine = [];

        foreach ($session as &$item)
        {
            $item['cycleWeekNumber'] = (! Helpers::IsNullOrEmpty($item['cycleWeekNumber']) && $item['cycleWeekNumber'] !== '0') ? $item['cycleWeekNumber'] : null;
            $item['sessionType'] = (! Helpers::IsNullOrEmpty($item['sessionType'])) ? array_search($item['sessionType'], CCSType::ENROLMENT_SESSION_TYPE_MAP) : null;
            $item['sessionUnitOfMeasure'] = (! Helpers::IsNullOrEmpty($item['sessionUnitOfMeasure'])) ? array_search($item['sessionUnitOfMeasure'], CCSType::ENROLMENT_SESSION_UNIT_OF_MEASURE_MAP) : null;

            (is_null($item['cycleWeekNumber']) && $item['sessionType'] === 1) ? $casual = $item : array_push($routine, $item);
        }

        return [
            'casual' => $casual,
            'routine' => $routine
        ];
    }
}
