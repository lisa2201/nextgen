<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Enums\BookingType;
use Kinderm8\Enums\CCSType;

class BookingResource extends Resource
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

        $prop = [
            'id' => $this->index,
            'date' => $this->date,
            'day' => $this->day,
            'week' => ($this->week)? $this->week : null,
            'price' => $this->fee_amount,
            'start' => $this->session_start,
            'end' => $this->session_end,
            'casual' => $this->is_casual,
            'status' => [
                'code' => $this->status,
                'text' => BookingType::STATUS_MAP[$this->status]
            ],
            'is_temp' => ($this->type === '1'),
            'ab_note' => [
                'text' => CCSType::BOOKING_ABSENCE_REASON[$this->absence_reason],
                'value' => $this->absence_reason,
                'is_document_held' => $this->absence_document_held
            ],
            'deleted_on' => !is_null($this->deleted_at) ? DateTimeHelper::getTimezoneDatetime($this->deleted_at, auth()->user()->timezone)->toDateTimeString() : null,
            'created_on' => DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateTimeString(),
            'updated_on' => DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateTimeString(),
            'has_room_sync' => $this->child_room_sync,
            //
            'room' => new RoomResource($this->whenLoaded('room')),
            'fee' => new FeesResource($this->whenLoaded('fee'), [ 'adjusted_past_future' => true ]),
            'creator' => New UserResource($this->whenLoaded('creator'), [ 'basic' => true ]),
            'adjusted_fee' => new AdjustedFeeResource($this->whenLoaded('fee_adjusted'))
        ];

        if (array_key_exists('withAttendance', $this->params) && $this->params['withAttendance'])
        {
            if (array_key_exists('forSessionSummary', $this->params) && $this->params['forSessionSummary'])
            {
                $prop['attendance'] = new AttendanceResource($this->whenLoaded('attendance'), [ 'basic' => true ]);
            }
            else
            {
                $prop['attendance'] = new AttendanceResource($this->whenLoaded('attendance'));
            }
        }

        if (array_key_exists('withChild', $this->params) && $this->params['withChild'])
        {
            $prop['child'] = new ChildResource($this->whenLoaded('child'));
        }

        if (array_key_exists('withCreatedDate', $this->params) && $this->params['withCreatedDate'])
        {
            $prop['created_at'] = $this->created_at->format('Y-m-d');
        }

        if (array_key_exists('totalBookingData', $this->params) && $this->params['totalBookingData'])
        {
            $prop['totalBookingData'] = array_filter($this->params['totalBookingData'], function ($item) {
                return $item["date"] === $this->date;
            });
        }

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }
}
