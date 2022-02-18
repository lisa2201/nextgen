<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequestStoreRequest extends FormRequest
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
            'room' => 'nullable|string',
            'fee' => 'nullable|string',
            'type' => 'required|string',
            'booking' => 'required_if:type,1,2,4,5|string',
            'is_mobile' => 'required|boolean',
            'date' => 'required|date_format:Y-m-d',
            'end_date' => 'required_if:type,3|date_format:Y-m-d',
            'selected_days' => 'required_if:type,3|array',
            'morning_selected_days' => 'nullable',
            'afternoon_selected_days' => 'nullable',
            'late_action_time' => 'required_if:type,4,5|number',
            'late_action_desc' => 'nullable|string',
        ];
    }
}
