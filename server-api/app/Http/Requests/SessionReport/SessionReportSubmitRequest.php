<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SessionReportSubmitRequest extends FormRequest
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
            'child' => 'required|string',
            'enrol_id' => 'required|string|max:20',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d',
            'action' => 'required',
            'change_reason' => 'nullable|string|max:6',
            'reason_late_change' => 'nullable|string|max:1000',
            'reason_no_change' => 'nullable|string|max:1000',
            'sessions' => 'nullable|present|array',
        ];
    }
}
