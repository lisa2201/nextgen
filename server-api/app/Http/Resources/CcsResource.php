<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;

class CcsResource extends JsonResource
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
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource)) {
            return [];
        }

        if (array_key_exists("short", $this->params) && $this->params['short']) {
            $prop = [
                'id' => $this->index,
                'device_name' => $this->device_name
            ];
        } else if (array_key_exists("basic", $this->params) && $this->params['basic']) {
            $prop = [
                'id' => $this->index,
                'device_name' => $this->device_name,
                'activation_code' => ($this->activation_code != null) ? $this->activation_code : '',
            ];
        } else {
            $prop = [
                'id' => $this->index,
                'device_name' => $this->device_name,
                'activation_code' => ($this->activation_code != null) ? $this->activation_code : '',
                'status' => ($this->status != null) ? $this->status : false,
                'PRODA_org_id' => ($this->PRODA_org_id != null) ? $this->PRODA_org_id : null,
                'person_id' => ($this->person_id != null) ? $this->person_id : null,
                'device_status' => ($this->device_status != null) ? $this->device_status : null,
                'key_status' => ($this->key_status != null) ? $this->key_status : null,
                'key_expire' => ($this->key_expire != null) ? $this->key_expire : null,
                'device_expire' => ($this->device_expire != null) ? $this->device_expire : null,
                'expired'=> ($this->key_expire > Carbon::now()) ?false : true
                // 'branch' => ($this->branch!= null? $this->branch: '')
            ];
        }

        $prop['providers'] = new ProviderSetupResourceCollection($this->whenLoaded('providers'));

        return $prop;
    }
}
