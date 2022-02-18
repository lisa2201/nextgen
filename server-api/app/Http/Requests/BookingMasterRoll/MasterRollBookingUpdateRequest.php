<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MasterRollBookingUpdateRequest extends FormRequest
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
            'children' =>  'required|present|array',
            'action' => 'required|string',
            'slots' => 'required|present|array',
            'operation' => 'nullable|string',
            'room' => 'nullable|string',
            'fee' => 'nullable|string',
        ];
    }
}
