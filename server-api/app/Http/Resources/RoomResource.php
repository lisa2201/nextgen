<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
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

        if(array_key_exists("short", $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'title' => $this->title
            ];
        }
        else if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'title' => $this->title,
                'description' => ($this->description != null) ? $this->description : '',
                'status' => $this->status === '0',
                'image' => null
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'title' => $this->title,
                'description' => ($this->description != null) ? $this->description : '',
                'start_time' => $this->start_time,
                'end_time' => $this->end_time,
                'staff_ratio' => $this->staff_ratio,
                'status' => $this->status === '0',
                'image' => null,
                'admin_only' => $this->admin_only,
                'child'=> new ChildResourceCollection($this->whenLoaded('child'), [ 'short' => true ]),
                'staff' => new UserResourceCollection($this->whenLoaded('staff'), [ 'short' => true ]),
                'capacity' => new RoomCapacityResourceCollection($this->whenLoaded('roomCapacity')),
            ];
        }

        return $prop;
    }
}
