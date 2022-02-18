<?php

namespace Kinderm8\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParentPaymentScheduleStoreRequest extends FormRequest
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
            'payment_frequency' => ['required'],
            'payment_day' => Rule::requiredIf($this->input('payment_frequency') != 'custom'),
            'user_id' => ['required'],
            'billing_term' => Rule::requiredIf($this->input('payment_frequency') != 'custom'),
            'next_payment_date' => Rule::requiredIf($this->input('payment_frequency') != 'custom')
        ];
    }

}
