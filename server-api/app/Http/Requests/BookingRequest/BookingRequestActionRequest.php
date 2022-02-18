<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequestActionRequest extends FormRequest
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
            'action' => 'required|string',
            'room' => 'nullable|string',
            'fee' => 'nullable|string',
            'date' => 'nullable|date_format:Y-m-d',
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d',
            'late_time' => 'nullable|number',
            'late_desc' => 'nullable|string',
            'abs_reason' => 'nullable|string',
            'abs_doc_held' => 'nullable|boolean',
            'adjust_fee_id' => 'nullable|string'
        ];
    }
}
