<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentPaymentStatementResource extends JsonResource
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
            "start_date" => $this->start_date,
            "end_date" => $this->end_date,
            "generation_method" => $this->generation_method,
            "amount" => $this->amount,
            "url" => $this->link,
            "created_at" => $this->created_at,
            "user" => new UserResource($this->whenLoaded('parent'), ['invitation' => true])
        ];

        return $prop;
    }
}
