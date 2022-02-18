<?php

namespace Kinderm8\Http\Resources;

use Carbon\Carbon;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use LocalizationHelper;

class CCSEntitlmentResource extends JsonResource
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
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        if(array_key_exists('report', $this->params) && $this->params['report'])
        {
            $prop = [
                'child' => $this->getChildEnrolment->child,
                'enrolment_id' => $this->enrolment_id,
                'date' => DateTimeHelper::getDateFormat($this->date),
                'ccs_percentage' => $this->ccs_percentage,
                'ccs_withholding_percentage' => $this->ccs_withholding_percentage,
                'ccs_total_hours' => $this->ccs_total_hours,
                'apportioned_hours' => $this->apportioned_hours,
                'accs_hourly_rate_cap_increase' => $this->accs_hourly_rate_cap_increase,
                'annual_cap_reached' => $this->annual_cap_reached,
                'absence_count' => $this->absence_count,
                'pre_school_excemption' => $this->pre_school_excemption,
                'previous' => $this->previous_record,
            ];
        }
        else
        {
            $prop = [
                'child' => ($this->getChildEnrolment) ? $this->getChildEnrolment->child : null,
                'id' => $this->index,
                'organization_id' => $this->organization_id,
                'branch_id' => $this->branch_id,
                'enrolment_id' => $this->enrolment_id,
                'date' => DateTimeHelper::getDateFormat($this->date),
                'ccs_percentage' => $this->ccs_percentage,
                'ccs_withholding_percentage' => $this->ccs_withholding_percentage,
                'ccs_total_hours' => $this->ccs_total_hours,
                'apportioned_hours' => $this->apportioned_hours,
                'accs_hourly_rate_cap_increase' => $this->accs_hourly_rate_cap_increase,
                'annual_cap_reached' => $this->annual_cap_reached,
                'absence_count' => $this->absence_count,
                'pre_school_excemption' => $this->pre_school_excemption,
                'previous' => $this->previous_record,
                'paid_absence' => $this->paid_absence,
                'unpaid_absence' => $this->unpaid_absence,
                'absences_available_no_evidence' => $this->absences_available_no_evidence,
            ];
        }

        // $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }

}
