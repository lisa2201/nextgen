<?php

namespace Kinderm8\Http\Resources;
use Helpers;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class VisitorDetailResource extends JsonResource
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
            'firstname' => $this->firstname,
            'surname' => $this->surname,
            'organization' => $this->organization,
            'person_to_meet' => $this->whenLoaded('personToMeet', new UserResource($this->personToMeet, [ 'short' => true ])),
            'person_to_meet_custom' => $this->person_to_meet_custom,
            'reason_for_visit' => $this->reason_for_visit,
            'mobile_number' => $this->mobile_number,
            'sign_in' => $this->sign_in,
            'sign_out' => $this->sign_out,
            'signature' => $this->signature,
            'visitor_image' => $this->visitor_image,
            'temperature' => $this->temperature,
            'check_list' => $this->check_list            
        ];
        return $prop;
    }
}
