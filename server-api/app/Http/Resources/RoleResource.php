<?php

namespace Kinderm8\Http\Resources;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;
use Kinderm8\Enums\RoleType;

class RoleResource extends Resource
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

        if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'group' =>  RoleType::PORTAL_ROLE_LEVELS_MAP[$this->type],
                'type' => $this->type,
                'display' => $this->display_name
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'attr_id' => Helpers::generateSerialCode(),
                'name' => $this->name,
                'group' =>  RoleType::PORTAL_ROLE_LEVELS_MAP[$this->type],
                'type' => $this->type,
                'desc' => $this->description,
                'display' => $this->display_name,
                'org' => $this->org_id,
                'org_name' => $this->org_name,
                'color' => $this->color_code,
                'is_admin' => ($this->is_admin == '0') ? false : true,
                'isedit' => ($this->editable == 0) ? false : true,
                'isdel' => ($this->deletable == 0) ? false : true,
                'cdate'   => $this->created_at->toDateString(),
                'selectedPrems' => $this->getPermissions($this),
                'sdelete' => false
            ];
        }

        return $prop;
    }

    function getPermissions($obj)
    {
        $perm_list = [];

        foreach ($obj->permissions as $perm)
        {
            array_push($perm_list, Helpers::hxCode($perm->id));
        }

        return $perm_list;
    }
}
