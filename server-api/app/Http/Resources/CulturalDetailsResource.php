<?php

namespace Kinderm8\Http\Resources;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class CulturalDetailsResource extends JsonResource
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
        
        $prop = [
            'id' => $this->index,
            'ab_or_tsi' => $this->ab_or_tsi,
            'cultural_background' => $this->cultural_background,
            'language' => $this->language,
            'cultural_requirements_chk' =>  $this->cultural_requirements_chk,
            'cultural_requirements' =>  $this->cultural_requirements,
            'religious_requirements_chk' =>  $this->religious_requirements_chk,
            'religious_requirements' =>  $this->religious_requirements 
        ];

        return $prop;
    }
}
