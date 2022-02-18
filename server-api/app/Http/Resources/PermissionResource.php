<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Enums\NavigationActionType;

class PermissionResource extends Resource
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
            'attr_id' => Helpers::generateSerialCode(),
            'name' => $this->display_name,
            'description' => $this->description,
            'type' => $this->type,
            'level' => $this->access_level,
            'isedit' => ($this->editable == 0) ? false : true,
            'cdate' => $this->created_at->toDateString(),
        ];

        if(array_key_exists('showPermType', $this->params) && $this->params['showPermType'])
        {
            $prop['is_parent'] = $this->perm_slug === NavigationActionType::ACTION_TYPE_VIEW;
        }

        if(array_key_exists('showAdditional', $this->params) && $this->params['showAdditional'])
        {
            $prop['gname'] = $this->name;
            $prop['nav_ref'] = $this->navigation_ref_id;
            $prop['slug'] = $this->perm_slug;
        }

        return $prop;
    }
}
