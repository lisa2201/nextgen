<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdjustedFeeResource extends JsonResource
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
            'net_amount' => $this->net_amount,
            'gross_amount' => $this->gross_amount,
            'effective_from' => $this->effective_date,
            'status' => $this->status,
            'is_bookings_updated' => $this->future_bookings_updated,
            'editable' => isset($this->bookings_count) && $this->bookings_count < 1,
            'deleted_on' => !is_null($this->deleted_at) ? DateTimeHelper::getTimezoneDatetime($this->deleted_at, auth()->user()->timezone)->toDateTimeString() : null,
            'created_on' => DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateTimeString(),
            'updated_on' => DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateTimeString(),
            //
            'creator' => New UserResource($this->whenLoaded('creator'), [ 'basic' => true ]),
        ];

        return $prop;
    }
}
