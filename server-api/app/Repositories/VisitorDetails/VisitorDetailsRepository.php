<?php

namespace Kinderm8\Repositories\VisitorDetails;

use Helpers;
use Kinderm8\Enums\RoleType;
use Illuminate\Http\Request;
use Kinderm8\VisitorDetails;
use Kinderm8\Branch;
use RequestHelper;
use Carbon\Carbon;
use Log;

class VisitorDetailsRepository implements IVisitorDetailsRepository
{
    private $visitorDetail;

    public function __construct(VisitorDetails $visitorDetail, Branch $branch)
    {
        $this->visitorDetail = $visitorDetail;
        $this->branch_id = RequestHelper::getBranchId();

        $branch = $branch->find(RequestHelper::getBranchId());
        $this->organization_id = $branch->organization_id;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->visitorDetail, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        // TODO: Implement get() method.
    }

    /**     
     * @param Collection
     * @param string $user_model
     * @return Builder[]|Collection
     */
    public function getStaffList(string $user_model){

        $user_list = app("Kinderm8\\{$user_model}")
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            ->where('km8_users.organization_id', '=', $this->organization_id)
            ->where('km8_users.branch_id', '=', $this->branch_id)
            ->whereNull('km8_users.deleted_at')
            ->where('km8_users.status', '=', '0')
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::ADMINPORTAL .'%')
            ->select(['km8_users.*'])
            ->groupBy(['km8_users.id'])
            ->orderBy('km8_users.first_name','asc')
            ->get();

        return $user_list;
    }


    /**
     * @param Request $request
     * @return mixed
     */
    public function store(Request $request)
    {
        $visitorDetail = new $this->visitorDetail;        

        $visitorDetail->organization_id = $this->organization_id;
        $visitorDetail->branch_id = $this->branch_id;
        $visitorDetail->firstname = $request->input('firstname');
        $visitorDetail->surname = $request->input('surname');
        $visitorDetail->organization = $request->input('organization');
        $visitorDetail->person_to_meet = (! Helpers::IsNullOrEmpty($request->input('person_to_meet'))) ? Helpers::decodeHashedID($request->input('person_to_meet')) : null;
        $visitorDetail->person_to_meet_custom = $request->input('person_to_meet_custom');
        $visitorDetail->reason_for_visit = $request->input('reason_for_visit');
        $visitorDetail->mobile_number = $request->input('mobile_number');
        $visitorDetail->sign_in = $request->input('sign_in');
        $visitorDetail->signature = $request->input('signature');
        $visitorDetail->visitor_image = $request->input('visitor_image');
        $visitorDetail->temperature = $request->input('temperature');
        $visitorDetail->check_list = $request->input('check_list');        

        $visitorDetail->save();

        return $visitorDetail;
    }

    /**
     * @param string $id
     * @return mixed
     */
    public function signoutVisitor(string $id)
    {
        $current_time = Carbon::now();

        $visitorDetail = $this->visitorDetail
                            ->where('id', '=', $id)
                            ->whereNull('sign_out')
                            ->get()
                            ->first();
        
        if($visitorDetail != null){
            
            $visitorDetail->sign_out = $current_time;
            $visitorDetail->updated_at = $current_time;      
          
            $visitorDetail->update();
    
            return true;
        }else{
            return false;
        }
        
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     */
    public function update(string $id, Request $request)
    {
        $visitorDetail = $this->visitorDetail
                            ->where('id', '=', $id)
                            ->get()
                            ->first();
        
        if($visitorDetail != null){

            $visitorDetail->firstname = $request->input('firstname');
            $visitorDetail->surname = $request->input('surname');
            $visitorDetail->organization = $request->input('organization');
            $visitorDetail->person_to_meet = (! Helpers::IsNullOrEmpty($request->input('person_to_meet'))) ? Helpers::decodeHashedID($request->input('person_to_meet')) : null;
            $visitorDetail->person_to_meet_custom = $request->input('person_to_meet_custom');
            $visitorDetail->reason_for_visit = $request->input('reason_for_visit');
            $visitorDetail->mobile_number = $request->input('mobile_number');
            $visitorDetail->sign_in = $request->input('sign_in');
            $visitorDetail->sign_out = (! Helpers::IsNullOrEmpty($request->input('sign_out'))) ? $request->input('sign_out') : null;
            $visitorDetail->signature = $request->input('signature');
            $visitorDetail->visitor_image = $request->input('visitor_image');
            $visitorDetail->temperature = $request->input('temperature');
            $visitorDetail->check_list = $request->input('check_list');        
          
            $visitorDetail->update();
    
            return true;
        }else{
            return false;
        }
        
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $rowObj = $this->visitorDetail
                            ->where('id', '=', $id)
                            ->get()
                            ->first();

        if($rowObj != null){
            $rowObj->delete();
            return true;

        }else{
            return false;
        }
        
    }

}