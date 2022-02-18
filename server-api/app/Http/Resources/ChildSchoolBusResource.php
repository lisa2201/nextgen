<?php

namespace Kinderm8\Http\Resources;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class ChildSchoolBusResource extends JsonResource
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
            'child_id' => $this->child_id,
            'school' => $this->whenPivotLoadedAs('school', 'km8_school_list', function () {
                return $this->school;
            }),
            'bus' =>  $this->whenPivotLoadedAs('bus', 'km8_bus_list', function () {
                return $this->bus;
            }),
            'room' => $this->whenPivotLoadedAs('room', 'km8_rooms', function () {
                return $this->room;
            }),
        ];
        return $prop;
    }
}
