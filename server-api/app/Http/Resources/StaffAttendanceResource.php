<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Room;

class StaffAttendanceResource extends Resource
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
     * @param  Request  $request
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
            'staff' => new UserResource($this->whenLoaded('staff'), [ 'short' => true ]),
            'checkin_type' => $this->checkin_type,
            'checkin_to' => $this->checkin_to($this->checkin_type, $this->checkin_to_id),
            'checkin_datetime' => $this->checkin_datetime,
            'checkin_signature' => $this->checkin_signature,
            'checkout_datetime' => $this->checkout_datetime,
            'creator' => new UserResource($this->creator, [ 'short' => true ]),
//            'xx' => new UserResource($this->whenLoaded('creator'), [ 'short' => true ])
        ];

    }

    public function checkin_to($type, $id){

        if($type == 'room'){
           return new RoomResource(Room::find($id), [ 'basic' => true ]);
        }else{
            return null;
        }

    }

}
