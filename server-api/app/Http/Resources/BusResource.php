<?php

namespace Kinderm8\Http\Resources;

use DateTimeHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use PathHelper;
use StaticUrls;

class BusResource extends Resource
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

        if (array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->bus_name,
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'name' => $this->bus_name,
                'deleted_on' => !is_null($this->deleted_at) ? DateTimeHelper::getTimezoneDatetime($this->deleted_at, auth()->user()->timezone)->toDateTimeString() : null,
                'created_on' => DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateTimeString(),
                'updated_on' => DateTimeHelper::getTimezoneDatetime($this->updated_at, auth()->user()->timezone)->toDateTimeString(),
            ];
        }

        return $prop;
    }
}
