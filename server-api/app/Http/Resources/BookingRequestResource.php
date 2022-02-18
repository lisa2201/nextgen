<?php

namespace Kinderm8\Http\Resources;
use Kinderm8\Enums\BookingRequestType;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingRequestResource extends JsonResource
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

    public function toArray($request)
    {
        if (array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'child_id' => $this->child_id,
                'days' => $this->days,
                'status' =>  BookingRequestType::STATUS[$this->status]
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'date' => $this->start_date,
                'until' => $this->end_date,
                'morning_days' => $this->morning_days,
                'afternoon_days' => $this->afternoon_days,
                'week_days' => $this->selected_week_days,
                'type' => $this->type,
                'request_type' => $this->request_type,
                'days' => $this->days,
                'status' =>  BookingRequestType::STATUS[$this->status],
                'late' => [
                    'time' => $this->late_time,
                    'desc' => $this->late_desc
                ],
                //
                'child' => new ChildResource($this->whenLoaded('child'), [ 'short' => true, 'withRooms' => true ]),
                'room' => new RoomResource($this->whenLoaded('room'), [ 'basic' => true ]),
                'fee' => new FeesResource($this->whenLoaded('fee'), [ 'basic' => true, 'adjusted_past_future' => true ]),
                'booking' => new BookingResource($this->whenLoaded('booking')),
                'creator' => new UserResource($this->whenLoaded('creator'), [ 'basic' => true ]),
            ];
        }

        return $prop;
    }
}
