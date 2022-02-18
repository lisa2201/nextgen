<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingSingleUpdateRequest extends FormRequest
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
            'date' => 'required|date_format:Y-m-d',
            'room' => 'required|string',
            'fee_optional' => 'required|boolean',
            'fee' => 'required_if:fee_optional,0',
            'type' => 'required|string',
            'adjust_fee_id' => 'nullable|string',
            'abs_reason' => 'nullable|string',
            'abs_doc_held' => 'nullable|boolean',
            'start_time' => 'nullable|numeric',
            'end_time' => 'nullable|numeric',
            'hourly_start' => 'nullable|numeric',
            'hourly_end' => 'nullable|numeric',
        ];
    }
}
