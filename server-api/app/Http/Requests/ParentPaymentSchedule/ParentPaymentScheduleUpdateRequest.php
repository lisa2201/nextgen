<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParentPaymentScheduleUpdateRequest extends FormRequest
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
            'id' => ['required'],
            'status' => ['sometimes', 'required', Rule::in(['inactive'])],
            'auto_charge' => ['sometimes', 'required', 'boolean'],
            'fixed_amount' => [ 'sometimes', 'nullable', 'numeric'],
            'amount_limit' => [ 'sometimes', 'nullable' ,'numeric']
        ];
    }

}
