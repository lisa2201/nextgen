<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;

class PersonnelProviderResource extends Resource
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

        if(array_key_exists('api', $this->params) && $this->params['api'] && array_key_exists('apiData', $this->params) && $this->params['apiData'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' =>$this->params['apiData']['results'][0]['firstName'], //$this->first_name,
                'last_name' => $this->params['apiData']['results'][0]['lastName'], //$this->last_name,
                'phone' => $this->params['apiData']['results'][0]['phone'], //$this->phone,
                'email' => $this->params['apiData']['results'][0]['email'], //$this->email,
                'roles' => $this->params['apiData']['results'][0]['Roles'] ['results'] ? $this->params['apiData']['results'][0]['Roles'] ['results'] : $this->roles,//$this->roles,
                'wwcc' => $this->params['apiData']['results'][0]['WWCC']['results'] ? $this->params['apiData']['results'][0]['WWCC']['results'] : null, //$this->wwcc,
                'provider_id' => $this->params['apiData']['results'][0]['providerID'], //$this->provider_id,
                'is_synced' => $this->is_synced,
                'syncerror' => $this->syncerror,
                'indentification'=> $this->indentification,
                'proda_id' => $this->params['apiData']['results'][0]['personID'], //$this->proda_id,
                'dob' => $this->dob,
                'personnel_declaration' => $this->personnel_declaration,
                'supporting_documents' => $this->params['apiData']['results'][0]['SupportingDocuments']['results']?$this->params['apiData']['results'][0]['SupportingDocuments']['results'] : null, //$this->supporting_documents,
                'user' => $this->user_index,
                'person_id' =>$this->person_id,
            ];
        }

        else {

            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'phone' => $this->phone,
                'email' => $this->email,
                'roles' => $this->roles,
                'wwcc' => $this->wwcc,
                'provider_id' => $this->provider_id,
                'is_synced' => $this->is_synced,
                'syncerror' => $this->syncerror,
                'indentification'=> $this->indentification,
                'proda_id' => $this->proda_id,
                'dob' => $this->dob,
                'personnel_declaration' => $this->personnel_declaration,
                'supporting_documents' => $this->supporting_documents,
                'person_id' =>$this->person_id,
                // 'branch' => $this->branch_index,
                'user' => $this->user_index,
                'provider' => new ProviderSetupResource($this->whenLoaded('provider')),
                'user' => new UserResource($this->whenLoaded('user')),
                'organization' => new OrganizationResource($this->whenLoaded('organization'))
            ];
        }

        return $prop;
    }
}
