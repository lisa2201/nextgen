<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class SubscriptionVerifyCodeResource extends Resource
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

        return [
            'id' => $this->index,
            'code' => $this->code,
            'email' => $this->email,
            'data' => $this->data,
            'cdate' => $this->created_at->toDateString(),
            'edate' => $this->expires_at->toDateString(),
            'expired' => $this->isExpired()
        ];
    }
}
