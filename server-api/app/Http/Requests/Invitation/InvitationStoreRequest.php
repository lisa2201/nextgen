<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InvitationStoreRequest extends FormRequest
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
            'email' => 'required|email:rfc',
            'type' => 'required|string|max:1',
            'role_map' => 'required|present|array',
            'org' => 'nullable',
            'branch' => 'nullable'
        ];
    }
}
