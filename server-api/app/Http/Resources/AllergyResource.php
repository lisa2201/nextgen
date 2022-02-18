<?php

namespace Kinderm8\Http\Resources;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class AllergyResource extends JsonResource
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
            'child_id' => $this->child_id,
            'type' => $this->allergyType,
            'description' =>  $this->description 
        ];
        return $prop;
    }
}
