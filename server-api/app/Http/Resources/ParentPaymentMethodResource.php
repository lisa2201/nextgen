<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use LocalizationHelper;
use PaymentHelpers;

class ParentPaymentMethodResource extends JsonResource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource, $params = [])
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource)) {
            return [];
        }

        $prop = [
            "id" => $this->index,
            "type" => $this->payment_type,
            "status" => ($this->status == '0') ? true : false,
            "instrument" => $this->attachInstruments(),
            "expiry" => $this->exp_month ? $this->attachExpiry() : null,
            "full_name" => $this->first_name . ' ' . $this->last_name,
            "address_1" => $this->address1,
            "address_2" => $this->address2,
            "zip_code" => $this->zip_code,
            "city" => $this->city,
            "state" => $this->state,
            "country_code" => $this->country_code,
            "country" => $this->attachCountry(),
            "mode" => $this->mode,
            "account_name" => $this->attachAccountName(),
            "synced" => $this->synced,
            "reference" => $this->ref_id,
            "created_at" => $this->created_at,
            "updated_at" => $this->updated_at
        ];

        return $prop;
    }

    public function attachInstruments()
    {

        $properties = $this->properties;

        if ($this->mode === PaymentHelpers::PAYMENT_MODES[1] && $this->last4) {
            $data = LocalizationHelper::getTranslatedText('payment.card_ending_in') . ' ' . str_pad($this->last4, 4, '0', STR_PAD_LEFT);
        } else if ($this->mode === PaymentHelpers::PAYMENT_MODES[0] && $this->last4) {
            $data = LocalizationHelper::getTranslatedText('payment.account_ending_in') . ' ' . str_pad($this->last4, 4, '0', STR_PAD_LEFT);
        } else if ($this->payment_type === PaymentHelpers::PAYMENT_TYPES[2]) {
            $data = LocalizationHelper::getTranslatedText('payment.cash_payment');
        } else if ($this->payment_type === PaymentHelpers::PAYMENT_TYPES[3]) {
            $data = array_key_exists('billercode', $properties) ? $properties['billercode'] : null;
        } else {
            $data = null;
        }

        return $data;
    }

    public function attachExpiry()
    {

        if ($this->mode === PaymentHelpers::PAYMENT_MODES[1]) {
            $data = LocalizationHelper::getTranslatedText('payment.expires_on') . ' ' . str_pad(strval($this->exp_month), 2, '0', STR_PAD_LEFT) . '/' . $this->exp_year;
        } else {
            $data = null;
        }

        return $data;
    }

    public function attachCountry()
    {

        $json_data = json_decode(file_get_contents(resource_path('data/countries.json')), true);

        $index = array_search($this->country_code, array_column($json_data, 'code'));

        if ($index !== false) {
            return isset($json_data[$index]) ? $json_data[$index]['name'] : null;
        } else {
            return null;
        }
    }

    public function attachAccountName()
    {
        $properties = $this->properties;

        if ($properties[PaymentHelpers::PAYMENT_PROPERTIES[2]]) {
            return $properties[PaymentHelpers::PAYMENT_PROPERTIES[2]];
        } else {
            return null;
        }
    }
}
