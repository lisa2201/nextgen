<?php
namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;
use Illuminate\Support\Facades\Log;

class ProviderSetupResource extends Resource
{
    private $params;

    public function _construct($resource, $params = [])
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
        if (is_null($this->resource))
        {
            return [];
        }

        $prop = [
            'id' => $this->index,
            'buisness_name' => $this->buisness_name,
            'legal_name' => $this->legal_name,
            'provider_id' => $this->provider_id,
            'name_type' => $this->name_type,
            'entity_type'=>$this->entity_type,
            'ABN'=>$this->ABN,
            'registration_code'=>$this->registration_code,
            'date_of_event'=>$this->created_at,
            'mobile'=>$this->mobile,
            'email'=>$this->email,
            'address' => json_decode($this->address),
            'state' => json_decode($this->state),
            'financial' => json_decode($this->financial),
            'contact' => json_decode($this->contact),
            'is_synced' => $this->is_synced,
            'syncerror' => $this->syncerror,
            'services' => new ServiceSetupResourceCollection($this->whenLoaded('services')),
            'ccs_setup' => new CcsResource($this->whenLoaded('ccsSetup'))
        ];


        return $prop;
    }

}
