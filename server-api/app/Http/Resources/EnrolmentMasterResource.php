<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Enums\StatusNumeric;

class EnrolmentMasterResource extends Resource
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

    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     * @return array
     */
    public function toArray($request)
    {

        if (is_null($this->resource)) {
            return [];
        }
        if ($request['form'] == 'enquiry') {
            $qq = $this->questions_enquiry;
        } else if ($request['form'] == 'waitlist') {
            $qq = $this->questions_waitlist;
        } else {
            $qq = $this->questions_enrolment;
        }

        $max_timestamp = '2000-01-01 12:00:00';
        foreach ($qq as $q) {
            $questions[] = [
                'id' => \Helpers::hxCode($q->id),
                'input_type' => $q->input_type,
                'question' => $q->question,
                'input_placeholder' => $q->input_placeholder,
                'input_required' => $q->input_required,
                'input_name' => $q->input_name,
                'hidden' => 0 == $q->hidden,
                'input_hiddenfield_name' => $q->input_hiddenfield_name,
                'input_placeholder_name' => $q->input_placeholder_name,
                'input_mandatory' => 0 == $q->input_mandatory,
                'input_mandatory_changeable' => 0 == $q->input_mandatory_changeable,
                'types' => $q->types,
                'column_width' => $q->column_width,
                'column_height' => $q->column_height,
                'column_order' => $q->column_order,
                'access_for' => $q->access_for,
                'status' => $q->status,
            ];

            if ($q->updated_at > $max_timestamp) {
                $max_timestamp = $q->updated_at;
            }

        }


        $prop = [
            'id' => $this->index,
            'title' => $this->section_name,
            'section_code' => $this->section_code,
            'mandatory' => 0 == $this->mandatory,
            'section_position_static' => 0 == $this->section_position_static,
            'section_order' => (int)$this->section_order,
            'section_hide' => 0 == $this->hide_status,
            'inputs' => $questions,
            'section_latest_updated_at' => $max_timestamp->toDateTimeString(),
        ];

        return $prop;
    }
}
