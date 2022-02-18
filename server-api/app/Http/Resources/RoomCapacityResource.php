<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomCapacityResource extends JsonResource
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
     * @param Request $request
     * @return array
     */
    public function toArray($request)
    {
        $prop = [
            'id' => $this->index,
            'capacity' => $this->capacity,
            'status' => ($this->status == '0') ? true : false,
            'effective_date' => $this->effective_date,
            'room' => new RoomResource($this->whenLoaded('room'), [ 'basic' => true ]),
            'author' => new UserResource($this->whenLoaded('user'), [ 'short' => true ]),
            'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
            'created_at' => $this->created_at,
        ];

        return  $prop;
    }
}
