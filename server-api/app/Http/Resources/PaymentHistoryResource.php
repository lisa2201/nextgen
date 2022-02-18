<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\PaymentInformations;
use LocalizationHelper;
use PaymentHelpers;

class PaymentHistoryResource extends Resource
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
        if (is_null($this->resource))
        {
            return [];
        }

        $prop = [
            "id" => $this->index,
            "payment_ref" => $this->payment_ref,
            "transaction_ref" => $this->transaction_ref,
            "amount" => $this->amount,
            "date" => $this->date->toDateString(),
            "payment_type" => $this->payment_type,
            "status" => $this->status,
            "properties" => $this->properties != null ? json_decode($this->properties) : null,
            "created_on" => $this->created_at->toDateString()
        ];

        if (array_key_exists('withOrg', $this->params) && ($this->params['withOrg'] === true)) {
            $prop["organization"] = new OrganizationResource($this->whenLoaded('organization'));
        }

        if (array_key_exists('withInvoice', $this->params) && ($this->params['withInvoice'] === true)) {
            $prop["invoice"] = new InvoiceResource($this->whenLoaded('invoice'));
        }

        if (array_key_exists('withPaymentMethod', $this->params) && ($this->params['withPaymentMethod'] === true)) {
            $prop["payment_method"] = new PaymentInformationsResource($this->whenLoaded('payment_method'));
        }

        return $prop;
    }

}
