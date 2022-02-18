<?php

namespace Kinderm8\Http\Resources;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class HealthAndMedicalResource extends JsonResource
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
        if (is_null($this->resource))
        {
            return [];
        }
        
        $prop = [
            'id' => $this->index,
            'child_id' => $this->child,
            'ref_no' => $this->ref_no,
            'medicare_expiry_date' =>  $this->medicare_expiry_date,
            'ambulance_cover_no' =>  $this->ambulance_cover_no,
            'health_center' =>  $this->health_center,
            'service_name' =>  $this->service_name,
            'service_phone_no' =>  $this->service_phone_no,
            'service_address' =>  $this->service_address,
        ];
        return $prop;
    }
}
