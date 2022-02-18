<?php

namespace Kinderm8\Http\Resources;
use Log;
use DateTimeHelper;

use Illuminate\Http\Resources\Json\JsonResource;

class ChildDocumentsResource extends JsonResource
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
            'documents' => $this->documents,
            'image' => $this->child_profile_image
        ];

        return $prop;
    }
}
