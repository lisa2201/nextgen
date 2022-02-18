<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InvitationAcceptRequest extends FormRequest
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
            'reference' => 'required',
            'first' => 'required',
            'last' => 'required',
            'password' => 'required',
            'recaptcha' => 'required|recaptcha',
            'phone' => 'nullable|max:50',
            'address1' => 'nullable|max:320',
            'address2' => 'nullable|max:320',
        ];
    }
}
