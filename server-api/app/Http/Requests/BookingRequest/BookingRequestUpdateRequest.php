<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequestUpdateRequest extends FormRequest
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
            'room' => 'nullable|string',
            'fee' => 'nullable|string',
            'type' => 'required|string',
            'date' => 'required|date_format:Y-m-d',
            'end_date' => 'required_if:type,3|date_format:Y-m-d',
            'selected_days' => 'required_if:type,3|present|array',
            'morning_selected_days' => 'nullable',
            'afternoon_selected_days' => 'nullable',
            'late_action_time' => 'required_if:type,4,5|number',
            'late_action_desc' => 'nullable|string',
        ];
    }
}
