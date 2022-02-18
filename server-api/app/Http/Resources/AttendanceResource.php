<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;

class AttendanceResource extends Resource
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

        if (array_key_exists('basic', $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'date' => $this->date,
                'check_in_time' => $this->drop_time,
                'check_out_time' => $this->pick_time,
                'is_extra' => $this->is_extra_day === '1',
                'is_submitted' => $this->ccs_submitted,
                'type' => $this->type,
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'date' => $this->date,

                'check_in_time' => $this->drop_time,
                'check_in_user' => new UserResource($this->dropper, [ 'short' => true ]),
                'check_in_note' => ($this->dropNote)? $this->dropNote->note : '',
                'check_in_sign' => !Helpers::IsNullOrEmpty($this->drop_signature) ? 'data:image/png;base64,' . $this->drop_signature : null,
                'check_in_geo' => $this->drop_geo_coordinates,

                'check_out_time' => $this->pick_time,
                'check_out_user' => new UserResource($this->picker, [ 'short' => true ]),
                'check_out_note' => ($this->pickNote)? $this->pickNote->note : '',
                'check_out_sign' => !Helpers::IsNullOrEmpty($this->pick_signature) ? 'data:image/png;base64,' . $this->pick_signature : null,
                'check_out_geo' => $this->pick_geo_coordinates,

                'is_extra' => ($this->is_extra_day === '1'),
                'is_submitted' => $this->ccs_submitted,
                'type' => $this->type,

                'check_in_parent' => new UserResource($this->dropParent, [ 'short' => true ]),
                'parent_check_in_time' => $this->parent_drop_time,
                'check_out_parent' => new UserResource($this->pickParent, [ 'short' => true ]),
                'parent_check_out_time' => $this->parent_pick_time,

                //'responsible_user' => $this->created_user
                'absence_note' => $this->absence_note,

                'bus' => new BusResource($this->whenLoaded('bus'), [ 'basic' => true ]),
                'school' => new SchoolResource($this->whenLoaded('school'))
            ];
        }

        if (array_key_exists('withBooking', $this->params) && $this->params['withBooking'])
        {
            $prop['booking'] = new BookingResource($this->booking);
        }

        if (array_key_exists('withChild', $this->params) && $this->params['withChild'])
        {
            $prop['child'] = new ChildResource($this->child);
        }

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }
}
