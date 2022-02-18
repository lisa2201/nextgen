<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ChildConsentsResource extends JsonResource
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
        $prop = [
            'id' => $this->index,
            'child_id' => $this->childIndex,
            'consent' => $this->consent,
            'answer' => $this->answer,
            'created_by' => [
                'full_name' => $this->creater->full_name,
                'email' => $this->creater->email,
                'created_at' => ($this->created_at) ? \DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateTimeString() : '',
            ],
            'updated_by' => $this->updated_at ? [
                'full_name' => $this->updater->full_name,
                'email' => $this->updater->email,
                'updated_at' => ($this->updated_at) ? \DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateTimeString() : '',
            ] : null,
        ];
        return $prop;
    }
}
