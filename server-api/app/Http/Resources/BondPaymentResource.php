<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BondPaymentResource extends JsonResource
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

        if(array_key_exists("short", $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'amount' => $this->amount
            ];
        }
        else if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'amount' => $this->amount,
                'type' => ($this->comments != null) ? $this->comments : '',
            ];
        }

            $prop = [
                'id' => $this->index,
                'amount' => $this->amount,
                'comments' => ($this->comments != null) ? $this->comments : '',
                'child' => $this->whenLoaded('child', new ChildResource($this->child,['basic'=>true])),
                'user' => $this->whenLoaded('user', new UserResource($this->user)),
                'type' => $this->type === '0' ? 'Receiving' : 'Returning',
                'date' => $this->date,
            ];
        return $prop;
    }
}
