<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChildStoreRequest extends FormRequest
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
            'f_name' => 'required|max:150',
            'l_name' => 'required|max:150',
            'dob' => 'required|date_format:Y-m-d',
            'gender' => 'required',
            'attendance' => 'present|array',
            'status' => 'required',
            'desc' => 'max:500',
        ];
    }
}
