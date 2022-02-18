<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class KinderPayAccessRequest extends FormRequest
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
            'branch' => 'required|string',
            'user' => 'required|string'
        ];
    }
}