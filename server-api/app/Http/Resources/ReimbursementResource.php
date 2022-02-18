<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReimbursementResource extends JsonResource
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
                'total' => $this->total,
                'note' => $this->note,
                'category' =>  new CategoryResource($this->whenLoaded('category')),
                'creator' => new UserResource($this->whenLoaded('creator'),['short'=> true]),
                'branch' => new BranchResource($this->whenLoaded('branch'),['short'=> true])

            ];

        return $prop;
    }

}
