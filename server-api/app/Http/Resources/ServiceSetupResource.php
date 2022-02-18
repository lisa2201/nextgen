<?php
namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;
use Illuminate\Support\Facades\Crypt;

class ServiceSetupResource extends Resource
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

        $username = $password = $fname = $lname = $authpersonid = null;

        if($this->credentials)
        {
            if(array_key_exists('username',$this->credentials))
                $username = $this->credentials['username'];
            if(array_key_exists('authpersonfname',$this->credentials))
                $fname = $this->credentials['authpersonfname'];
            if(array_key_exists('authpersonlname',$this->credentials))
                $lname = $this->credentials['authpersonlname'];
            if(array_key_exists('authpersonid',$this->credentials))
                $authpersonid = $this->credentials['authpersonid'];
            if(array_key_exists('password', $this->credentials))
                $password = Crypt::decryptString($this->credentials['password']);
        }

        return [
            'id' => $this->index,
            'service_id' => $this->service_id,
            'service_type'=>$this->service_type,
            'service_name'=>$this->service_name,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'no_of_weeks'=>$this->no_of_weeks,
            'ACECQARegistrationCode'=>$this->ACECQARegistrationCode,
            'ACECQAExemptionReason'=>$this->ACECQAExemptionReason,
            'service_approvel_status'=>$this->service_approvel_status,
            'mobile'=>$this->mobile,
            'address' => $this->address,
            'financial' => json_decode($this->financial),
            'contact' => json_decode($this->contact),
            'is_synced' => $this->is_synced,
            'syncerror' => $this->syncerror,
            'username' => $username,
            'password' => $password,
            'authpersonfname' => ($fname)? $fname : auth()->user()->first_name,
            'authpersonlname' => ($lname)? $lname : auth()->user()->last_name,
            'authpersonid' => ($authpersonid) ? $authpersonid :'',
            'provider' =>  new ProviderSetupResource($this->whenLoaded('provider'))
        ];
    }

}
