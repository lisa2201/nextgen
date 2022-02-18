<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WaitlistNoteResource extends JsonResource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @return void
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
     * @param \Illuminate\Http\Request $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource)) {
            return [];
        }

        $prop = [
            'id' => $this->index,
            'waitlist_enrol_id' => $this->waitEnrolIndex,
            'accessibility' => $this->created_by == auth()->user()->id,
            'type' => $this->type == 1 ? 'waitlist' : 'enrolment',
            'note' => $this->note,
            'created_by' => $this->creator->full_name,
            'updated_by' => $this->updated_by ? $this->updater->full_name : null,
            'created_by_avatar' => $this->creator->avatar,
            'created_at' => ($this->created_at) ? \DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateTimeString() : '',
            'updated_at' => ($this->updated_at) ? \DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateTimeString() : '',
        ];
        return $prop;
    }
}
