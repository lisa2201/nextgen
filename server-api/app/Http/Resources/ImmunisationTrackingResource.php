<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImmunisationTrackingResource extends JsonResource
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
            'date' => $this->date,
            'schedule' => New ImmunisationScheduleResource($this->whenLoaded('schedule')),
            'child' => New ChildResource($this->whenLoaded('child'), [ 'short' => true ]),
            'immunisation' => New ImmunisationResource($this->whenLoaded('immunisation')),
            'creator' => New UserResource($this->whenLoaded('creator'), [ 'short' => true ]),
            'branch' => New BranchResource($this->whenLoaded('branch'),['short'=> true]),
            'created_on' => DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateString(),
            'updated_on' => DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateString(),
        ];

        return $prop;
    }

}
