<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class InvoiceItemResource extends Resource
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
            "name" => $this->name,
            "description" => $this->description,
            "price" => $this->price,
            "quantity" => $this->quantity,
            "unit" => $this->unit,
            "status" => $this->status,
            "created_at" => $this->created_at
        ];

        if (array_key_exists('withSubscription', $this->params) && ($this->params['withSubscription'] === true)) {
            $prop["org_subscription"] = $this->subcription;
        }

        if(array_key_exists('withInvoice', $this->params) && ($this->params['withInvoice'] === true))
        {
            $prop["invoice"] = new InvoiceResource($this->whenLoaded('invoice'));
        }

        return $prop;
    }
}
