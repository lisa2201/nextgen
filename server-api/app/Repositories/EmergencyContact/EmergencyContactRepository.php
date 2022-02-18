<?php

namespace Kinderm8\Repositories\EmergencyContact;

use Helpers;
use Illuminate\Http\Request;
use Kinderm8\ChildEmergencyContact;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use function foo\func;
use Log;

class EmergencyContactRepository implements IEmergencyContactRepository
{
    use UserAccessibility;

    private $emergencyContact;

    public function __construct(ChildEmergencyContact $emergencyContact)
    {
        $this->emergencyContact = $emergencyContact;
    }

    /**
     * @param Request $request
     * @return ChildEmergencyContact
     */
    public function store(Request $request, string $id)
    {
        $consentEmergencyContact = $request->input('consentEmergencyContact');
        $consentCollectChild = $request->input('consentCollectChild');
        $consentMakeMedicalDecision = $request->input('consentMakeMedicalDecision');
        $consentIncursion = $request->input('consentIncursion');

        $types = array();
        if($consentEmergencyContact){
            array_push($types, 'Emergency');
        }
        if($consentCollectChild){
            array_push($types, 'Collection');
        }
        if($consentMakeMedicalDecision){
            array_push($types, 'Medical');
        }
        if($consentIncursion){
            array_push($types, 'Excursion');
        }

        $emergencyObj = new $this->emergencyContact;

        $emergencyObj->child_profile_id =  $id;
        $emergencyObj->user_id =Helpers::decodeHashedID($request->input('user_id'));
        $emergencyObj->first_name = $request->input('firstname');
        $emergencyObj->last_name = $request->input('lastname');
        $emergencyObj->address = $request->input('address');
        $emergencyObj->email = $request->input('email');
        $emergencyObj->phone = $request->input('phone');
        $emergencyObj->phone2 = $request->input('mobile');
        $emergencyObj->relationship = $request->input('relationship');
        $emergencyObj->types = $types;

        $ecContactConsents = [
            'consent_incursion' => $consentIncursion,
            'consent_make_medical_decision' => $consentMakeMedicalDecision,
            'consent_emergency_contact' => $consentEmergencyContact,
            'consent_collect_child' => $consentCollectChild
        ];

        $emergencyObj->consents = $ecContactConsents;
        $emergencyObj->save();

        return $emergencyObj;
    }

    /**
     * @param $id
     * @param Request $request
     * @return ChildEmergencyContact
     */
    public function update($id, Request $request)
    {
        $emergencyContact = $this->findById($id, []);

        $consentEmergencyContact = $request->input('consentEmergencyContact');
        $consentCollectChild = $request->input('consentCollectChild');
        $consentMakeMedicalDecision = $request->input('consentMakeMedicalDecision');
        $consentIncursion = $request->input('consentIncursion');

        $types = array();
        if($consentEmergencyContact){
            array_push($types, 'Emergency');
        }
        if($consentCollectChild){
            array_push($types, 'Collection');
        }
        if($consentMakeMedicalDecision){
            array_push($types, 'Medical');
        }
        if($consentIncursion){
            array_push($types, 'Excursion');
        }

        $emergencyContact->first_name = $request->input('firstname');
        $emergencyContact->last_name = $request->input('lastname');
        $emergencyContact->address = $request->input('address');
        $emergencyContact->email = $request->input('email');
        $emergencyContact->phone = $request->input('phone');
        $emergencyContact->phone2 = $request->input('mobile');
        $emergencyContact->relationship = $request->input('relationship');
        $emergencyContact->types = $types;

        $ecContactConsents = [
            'consent_incursion' => $consentIncursion,
            'consent_make_medical_decision' => $consentMakeMedicalDecision,
            'consent_emergency_contact' => $consentEmergencyContact,
            'consent_collect_child' => $consentCollectChild
        ];

        $emergencyContact->consents = $ecContactConsents;
        $emergencyContact->save();

        return $emergencyContact;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $emergencyContact = $this->emergencyContact->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $emergencyContact->with($depends);
        }

        $emergencyContact = $emergencyContact->first();

        if (is_null($emergencyContact))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $emergencyContact;
    }

    /**
     * @param string $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $emergencyContact = $this->findById($id, []);

        if (is_null($emergencyContact))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $child_id = $emergencyContact->child_profile_id;

        if ($emergencyContact->deleted_at != null)
        {
            $emergencyContact->forceDelete();
        }
        else
        {
            $emergencyContact->delete();
        }

        return $child_id;
    }

    /**
     * @param string $id
     * @return ChildEmergencyContact
     */
    public function getEmergencyContactsByChild(string $id){

        return $this->emergencyContact
            ->where('child_profile_id', $id)
            ->orderBy('first_name','asc')
            ->get();

    }

    /**
     * @param string $id
     * @return ChildEmergencyContact
     */
    public function getEmergencyContactsByParent(){

        $children = Auth()->user()->child->pluck('id');

        return $this->emergencyContact
            ->whereIn('child_profile_id', $children)
            ->orderBy('first_name','asc')
            ->with(['child'])
            ->get();

    }

    /**
     * @param string $user_id
     * @return User EmergencyContacts
     */
    public function getEmergencyContactsByUser($user_id){

        return $this->emergencyContact
            ->where('user_id', '=', $user_id)
            ->get();

    }
}
