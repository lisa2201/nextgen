<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Carbon\Carbon;
use DateTimeHelper;

class BusAttendanceResource extends Resource
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
        $this->userTimezone = (auth()->check())? auth()->user()->timezone : null;
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
            'child_id' => Helpers::hxCode($this->child_id),
            'bus_id' => Helpers::hxCode($this->bus_id),
            'school_id' => Helpers::hxCode($this->school_id),
            'check_in_time' => $this->drop_time,
            'drop_time' => ($this->drop_time)? $this->convertToTime($this->drop_time): null,
            'check_in_user' => new UserResource($this->dropper, [ 'short' => true ]),
            'check_in_note' => ($this->dropNote)? $this->dropNote->note : null,
            'check_in_sign' => !Helpers::IsNullOrEmpty($this->drop_signature) ? 'data:image/png;base64,' . $this->drop_signature : null,
            'check_in_geo' => $this->drop_geo_coordinates,

            'check_out_time' => $this->pick_time,
            'pick_time' => ($this->pick_time)? $this->convertToTime($this->pick_time): null,
            'check_out_user' => new UserResource($this->picker, [ 'short' => true ]),
            'check_out_note' => ($this->pickNote)? $this->pickNote->note : null,
            'check_out_sign' => !Helpers::IsNullOrEmpty($this->pick_signature) ? 'data:image/png;base64,' . $this->pick_signature : null,
            'check_out_geo' => $this->pick_geo_coordinates,

            'type' => $this->type
        ];

        if(array_key_exists('withChild', $this->params) && $this->params['withChild'])
        {
            $prop['child'] = new ChildResource($this->child, ['basic' =>true]);
        }

        if(array_key_exists('withBus', $this->params) && $this->params['withBus'])
        {
            $prop['bus'] = new BusResource($this->bus, ['basic' =>true]);
        }

        if(array_key_exists('withSchool', $this->params) && $this->params['withSchool'])
        {
            $prop['school'] = new SchoolResource($this->school);
        }

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }

    private function convertToTime($time)
    {
        $time = DateTimeHelper::formatMinToTimeArray($time);
        $dt = Carbon::now($this->userTimezone);
        $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
        return $dt->format('g:i A');

    }

}
