<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CCSEnrolmentSubmitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'id' => 'required|string',
            'enrol_id' => 'nullable|string|max:20',
            'enrollment_start' => 'required|date_format:Y-m-d',
            'enrollment_end' => 'nullable|date_format:Y-m-d',
            'child' => 'required|string',
            'late_submission' => 'max:1000',
            'arrangement_type' => 'required',
            'sessions' => 'required|present|array',
            'weeks_cycle' => 'nullable|max:1',
            'arrangement_type_note' => 'nullable|max:50',
            'signing_party_first_name' => 'nullable|max:150',
            'signing_party_last_name' => 'nullable|max:150',
        ];
    }
}
