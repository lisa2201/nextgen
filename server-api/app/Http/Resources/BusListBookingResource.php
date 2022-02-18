<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Carbon\Carbon;
use DateTimeHelper;

class BusListBookingResource extends Resource
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
            'day' => $this->day,
        ];

        if(array_key_exists('withChild', $this->params) && $this->params['withChild'])
        {
            $prop['child'] = new ChildResource($this->child, ['basic' =>true, 'withBus' => true, 'withSchool' => true ]);
        }

        if(array_key_exists('withSchool', $this->params) && $this->params['withSchool'])
        {
            $prop['school'] = $this->school_bus;
        }

       /* if(array_key_exists('withBus', $this->params) && $this->params['withBus'])
        {
            $prop['bus'] = $this->whenPivotLoadedAs('school_bus', 'km8_child_school_bus', function () {
            return $this->child->school_bus->bus;
            });
        }*/

        /*if(array_key_exists('withSchool', $this->params) && $this->params['withSchool'])
        {
            $prop['school'] = $this->whenPivotLoadedAs('school_bus', 'km8_child_school_bus', function () {
            return $this->child->school_bus->school;
            });
        }*/


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
