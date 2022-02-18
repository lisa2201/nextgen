<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingPreviewRequest extends FormRequest
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
            'child' => 'required',
            'date_start' => 'required|date_format:Y-m-d',
            'date_end' => 'nullable|date_format:Y-m-d',
            'type' => 'required',
            'slots' => 'required|present|array',
        ];
    }
}
