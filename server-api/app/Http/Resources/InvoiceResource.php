<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class InvoiceResource extends Resource
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
            "number" => $this->number,
            "start_date" => $this->start_date->toDateString(),
            "end_date" => $this->end_date->toDateString(),
            "due_date" => $this->due_date->toDateString(),
            "subtotal" => $this->subtotal,
            "created_on" => $this->created_at->toDateString(),
            "status" => $this->status,
            "invoice_items" => []
        ];

        if(array_key_exists("withOrg", $this->params) && $this->params['withOrg'])
        {
            $prop['organization'] = new OrganizationResource($this->whenLoaded('organization'));
        }

        if (array_key_exists("withInvoiceItem", $this->params) && $this->params['withInvoiceItem'])
        {
            $prop['invoice_items'] = new InvoiceItemResourceCollection($this->whenLoaded('invoice_items'));
        }


        return $prop;
    }
}
