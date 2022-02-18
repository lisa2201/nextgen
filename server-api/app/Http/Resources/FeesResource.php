<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeesResource extends JsonResource
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
     * @param Request $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        if (array_key_exists("short", $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->fee_name,
            ];
        }
        else if (array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->fee_name,
                'type' => $this->fee_type,
                'session_start' => $this->session_start,
                'session_end' => $this->session_end
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->fee_name,
                'type' => $this->fee_type,
                'frequency' => $this->frequency,
                'net_amount' => $this->net_amount,
                'gross_amount' => $this->gross_amount,
                'session_start' => $this->session_start,
                'session_end' => $this->session_end,
                'vendor_name' => $this->vendor_name,
                'adjust' => $this->adjust,
                'visible' => $this->visibility,
                'status' => $this->status,
                'updated_at' => $this->updated_at,
                'effective_date' => $this->effective_date,
                'editable' => isset($this->bookings_count) && $this->bookings_count < 1
            ];
        }

        $prop['rooms'] = new RoomResourceCollection($this->whenLoaded('rooms'), [ 'short' => true ]);

        if (array_key_exists('adjusted', $this->params) && $this->params['adjusted'])
        {
            $prop['adjusted'] = new AdjustedFeeResourceCollection($this->whenLoaded('adjusted'));
        }

        if (array_key_exists('adjusted_past_future', $this->params) && $this->params['adjusted_past_future'])
        {
            $prop['adjusted_current'] = new AdjustedFeeResourceCollection($this->whenLoaded('adjusted_past_collection'));

            $prop['adjusted_next'] = new AdjustedFeeResourceCollection($this->whenLoaded('adjusted_future_collection'));
        }

        return $prop;
    }

}
