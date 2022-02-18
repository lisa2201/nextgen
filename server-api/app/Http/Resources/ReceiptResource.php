<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReceiptResource extends JsonResource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @param array $params
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
     * @param  Request $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }


            $prop = [
                'id' => $this->index,
                'date' => $this->date,
                'cost' => $this->cost,
                'gst' => $this->gst,
                'total' => $this->total,
                'gst_amount'=> $this->gst_amount,
                'note' => $this->note,
                'supplier' => new SupplierResource($this->whenLoaded('supplier')),
                'category' =>  new CategoryResource($this->whenLoaded('category')),
                'creator' => new UserResource($this->whenLoaded('creator'),['short'=> true]),
                'branch' => new BranchResource($this->whenLoaded('branch'),['short'=> true])

            ];

        return $prop;
    }

}
