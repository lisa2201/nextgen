<?php

namespace Kinderm8\Http\Resources;
use Helpers;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class StaffIncidentResource extends JsonResource
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

    public function toArray($request)
    {
        $prop = [
            'id' => $this->index,
            'staff' => new UserResource($this->whenLoaded('staff'), [ 'short' => true ]),
            'date' => $this->date,
            'time' => $this->time,
            'person_completing' => $this->person_completing,
            'witness_details' => $this->witness_details,
            'incident_details' => $this->incident_details,
            'notifications' => $this->notifications,
            'followup_requirments' => $this->followup_requirments,
            'supervisors_acknowledgement' => $this->supervisors_acknowledgement,
            'images' => ($this->images != '')? explode(',', $this->images): null
        ];
        return $prop;
    }
}
