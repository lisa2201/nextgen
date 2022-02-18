<?php

namespace Kinderm8\Repositories\StaffIncident;

use Helpers;
use Exception;
use ErrorHandler;
use Kinderm8\Enums\RoleType;
use Illuminate\Http\Request;
use Kinderm8\StaffIncident;
use RequestHelper;
use Carbon\Carbon;
use Kinderm8\Traits\UserAccessibility;
use Log;

class StaffIncidentRepository implements IStaffIncidentRepository
{
    use UserAccessibility;

    private $staffIncident;

    public function __construct(StaffIncident $staffIncident)
    {
        $this->staffIncident = $staffIncident;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->staffIncident, $method], $args);
    }

    /**
     * @param Request $request
     * @return incident
     */
    public function getIncident(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));
            $incdent = $this->staffIncident
                ->where('id', $id)
                ->first();

            // load relationships after pagination
            $incdent->load(['staff', 'branch']);

            return $incdent;
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }
    }

    /**
     * @param Request $request
     * @return array
     */
    public function list(Request $request)
    {
        $incdentList = [];
        $actualCount = 0;
        $displayCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

             //query builder
            $incdentList = $this->staffIncident                
                ->join('km8_users', 'km8_users.id', '=', 'km8_staff_incident.staff_id')
                ->where('km8_staff_incident.organization_id', auth()->user()->organization_id)
                ->where('km8_staff_incident.branch_id', auth()->user()->branch_id);
         
            if(auth()->user()->getRoleTypeForKinderConnect() == 'staff'){

                //staff user can view only own room staff incidents
                $room_staff = [];
                $user_rooms = auth()->user()->rooms;
                
                foreach($user_rooms as $room){
                    array_push($room_staff, $room->staff->pluck('id'));
                }

                $incdentList = $incdentList->whereIn('km8_staff_incident.staff_id', $room_staff);
            }

            $actualCount = $incdentList->get()->count();

            //filters
            if(!is_null($filters))
            {
                if(isset($filters) && $filters !== '0')
                {
                    if(isset($filters->start_date) && isset($filters->end_date))
                    {
                        $end_day  = Carbon::parse($filters->end_date);
                        $incdentList->whereBetween('km8_staff_incident.date', array($filters->start_date, $end_day->add(1, 'days')->format('Y-m-d')));
                    }

                    if(isset($filters->staff) && $filters->staff != '')
                    {
                        $incdentList->where('km8_staff_incident.staff_id', Helpers::decodeHashedID($filters->staff));
                    }

                }
            }

            //search
            if(!is_null($searchValue))
            {
                $incdentList->whereLike([
                    'km8_users.first_name',
                    'km8_users.last_name'
                ], $searchValue);
            }

            $displayCount = $incdentList->select('km8_staff_incident.*')->get()->count();

            $incdentList = $incdentList
                ->orderBy('km8_staff_incident.date', 'desc')
                ->paginate($offset);

            // load relationships after pagination
            $incdentList->load(['staff', 'branch']);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $incdentList,
            'totalRecords' => $actualCount,
            'displayRecord' =>$displayCount,
            'filtered' => !is_null($filters) && (isset($filters) && $filters !== '0')
        ];
    }

    /**
     * @param Request $request
     * @return mixed
     */
    public function store(Request $request)
    {
        $staffIncident = new $this->staffIncident;

        $person_completing = [
            'recordedPerson' => $request->input('recordedPerson'),
            'recordedPersonSignature' => $request->input('recordedPersonSignature'),
            'recordedDate' => $request->input('recordedDate'),
            'recordedTime' => $request->input('recordedTime'),
        ];

        $witness_details = [
            'witnessPerson' => $request->input('witnessPerson'),
            'witnessSignature' => $request->input('witnessSignature')
        ];

        $incident_details = [
            'incidentCircumstances' => $request->input('incidentCircumstances'),
            'incidentEquipments' => $request->input('incidentEquipments'),
            'incidentLocation' => $request->input('incidentLocation'),
            'incidentActionTaken' => $request->input('incidentActionTaken')
        ];

        $notifications = [
            'notificationParent' => $request->input('notificationParent'),
            'notificationParentDate' => $request->input('notificationParentDate'),
            'notificationParentTime' => $request->input('notificationParentTime'),
            'notificationParentContacted' => $request->input('notificationParentContacted'),
            'notificationSupervisor' => $request->input('notificationSupervisor'),
            'notificationSupervisorDate' => $request->input('notificationSupervisorDate'),
            'notificationSupervisorTime' => $request->input('notificationSupervisorTime'),
            'notificationSupervisorContacted' => $request->input('notificationSupervisorContacted'),
            'notificationOfficer' => $request->input('notificationOfficer'),
            'notificationOfficerDate' => $request->input('notificationOfficerDate'),
            'notificationOfficerTime' => $request->input('notificationOfficerTime'),
            'notificationOfficerContacted' => $request->input('notificationOfficerContacted'),
            'notificationMedical' => $request->input('notificationMedical'),
            'notificationMedicalDate' => $request->input('notificationMedicalDate'),
            'notificationMedicalTime' => $request->input('notificationMedicalTime'),
            'notificationMedicalContacted' => $request->input('notificationMedicalContacted'),
            'transportedByAmbulance' => $request->input('transportedByAmbulance'),
            'excludedFromshifts' => $request->input('excludedFromshifts'),
            'notifiedToAuthorities' => $request->input('notifiedToAuthorities'),
            'recommendedLeave' => $request->input('recommendedLeave')
        ];

        $followup_requirments= [
            'medicalCertificateProvided' => $request->input('medicalCertificateProvided'),
            'medicalCertificateSubmitted' => $request->input('medicalCertificateSubmitted')
        ];

        $supervisors_acknowledgement = [
            'supervisor' => $request->input('supervisor'),
            'supervisedDate' => $request->input('supervisedDate'),
            'supervisorSignature' => $request->input('supervisorSignature'),
            'supervisorComments' => $request->input('supervisorComments')
        ];

        $staffIncident->organization_id = auth()->user()->organization_id;
        $staffIncident->branch_id = auth()->user()->branch_id;
        $staffIncident->staff_id = Helpers::decodeHashedID($request->input('staff'));
        $staffIncident->date = $request->input('date');
        $staffIncident->time = $request->input('time');
        $staffIncident->person_completing = $person_completing;
        $staffIncident->witness_details = $witness_details;
        $staffIncident->incident_details = $incident_details;
        $staffIncident->notifications = $notifications;
        $staffIncident->followup_requirments = $followup_requirments;
        $staffIncident->supervisors_acknowledgement = $supervisors_acknowledgement;

        $fileInput = $request->input('upload_file');
        if(!empty($fileInput['IncidentImages']))
        {
            $staffIncident->images = implode(',', $fileInput['IncidentImages']);
        }
        else
        {
            $staffIncident->images = null;
        }
        $staffIncident->save();

        return $staffIncident;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     */
    public function update(string $id, Request $request)
    {
        $staffIncident = $this->staffIncident
            ->find($id);

        if($staffIncident){

            $person_completing = [
                'recordedPerson' => $request->input('recordedPerson'),
                'recordedPersonSignature' => $request->input('recordedPersonSignature'),
                'recordedDate' => $request->input('recordedDate'),
                'recordedTime' => $request->input('recordedTime'),
            ];

            $witness_details = [
                'witnessPerson' => $request->input('witnessPerson'),
                'witnessSignature' => $request->input('witnessSignature')
            ];

            $incident_details = [
                'incidentCircumstances' => $request->input('incidentCircumstances'),
                'incidentEquipments' => $request->input('incidentEquipments'),
                'incidentLocation' => $request->input('incidentLocation'),
                'incidentActionTaken' => $request->input('incidentActionTaken')
            ];

            $notifications = [
                'notificationParent' => $request->input('notificationParent'),
                'notificationParentDate' => $request->input('notificationParentDate'),
                'notificationParentTime' => $request->input('notificationParentTime'),
                'notificationParentContacted' => $request->input('notificationParentContacted'),
                'notificationSupervisor' => $request->input('notificationSupervisor'),
                'notificationSupervisorDate' => $request->input('notificationSupervisorDate'),
                'notificationSupervisorTime' => $request->input('notificationSupervisorTime'),
                'notificationSupervisorContacted' => $request->input('notificationSupervisorContacted'),
                'notificationOfficer' => $request->input('notificationOfficer'),
                'notificationOfficerDate' => $request->input('notificationOfficerDate'),
                'notificationOfficerTime' => $request->input('notificationOfficerTime'),
                'notificationOfficerContacted' => $request->input('notificationOfficerContacted'),
                'notificationMedical' => $request->input('notificationMedical'),
                'notificationMedicalDate' => $request->input('notificationMedicalDate'),
                'notificationMedicalTime' => $request->input('notificationMedicalTime'),
                'notificationMedicalContacted' => $request->input('notificationMedicalContacted'),
                'transportedByAmbulance' => $request->input('transportedByAmbulance'),
                'excludedFromshifts' => $request->input('excludedFromshifts'),
                'notifiedToAuthorities' => $request->input('notifiedToAuthorities'),
                'recommendedLeave' => $request->input('recommendedLeave')
            ];

            $followup_requirments= [
                'medicalCertificateProvided' => $request->input('medicalCertificateProvided'),
                'medicalCertificateSubmitted' => $request->input('medicalCertificateSubmitted')
            ];

            $supervisors_acknowledgement = [
                'supervisor' => $request->input('supervisor'),
                'supervisedDate' => $request->input('supervisedDate'),
                'supervisorSignature' => $request->input('supervisorSignature'),
                'supervisorComments' => $request->input('supervisorComments')
            ];

            $staffIncident->staff_id = Helpers::decodeHashedID($request->input('staff'));
            $staffIncident->date = $request->input('date');
            $staffIncident->time = $request->input('time');
            $staffIncident->person_completing = $person_completing;
            $staffIncident->witness_details = $witness_details;
            $staffIncident->incident_details = $incident_details;
            $staffIncident->notifications = $notifications;
            $staffIncident->followup_requirments = $followup_requirments;
            $staffIncident->supervisors_acknowledgement = $supervisors_acknowledgement;

            $fileInput = $request->input('upload_file');
            if(!empty($fileInput['IncidentImages']))
            {
                $images = ($staffIncident->images != '')? array_merge($fileInput['IncidentImages'], explode(',', $staffIncident->images)): $fileInput['IncidentImages'];
                $staffIncident->images = implode(',', $images);
            }

            $staffIncident->update();

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
        $rowObj = $this->staffIncident
            ->find($id);

        if($rowObj != null){
            $rowObj->delete();
            return true;

        }else{
            return false;
        }

    }

}
