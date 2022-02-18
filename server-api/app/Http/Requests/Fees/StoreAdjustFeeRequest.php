<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdjustFeeRequest extends FormRequest
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
            'name' => 'required|string',
            'nAmount' => 'required|string',
            'frequency' => 'required|string',
            'vendor' => 'required|string',
            'type' => 'required|string',
            'visible' => 'required|string',
            'session_start' => 'required_if:frequency,0|numeric',
            'session_end' => 'required_if:frequency,0|numeric',
            'rooms' => 'nullable|array',
            'update_bookings' => 'nullable|boolean'
        ];
    }
}
