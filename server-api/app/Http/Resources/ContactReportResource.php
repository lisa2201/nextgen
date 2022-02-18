<?php

namespace Kinderm8\Http\Resources;

use Carbon\Carbon;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use LocalizationHelper;

class ContactReportResource extends JsonResource
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

        if(array_key_exists('PACDR', $this->params) && $this->params['PACDR'])
        {
            $prop = [];

            foreach($this->parents as $parent) {
                $data = [
                    'id' => $this->index,
                    'f_name' => $this->first_name,
                    'l_name' => $this->last_name,
                    'm_name' => ($this->middle_name != null) ? $this->middle_name : '',
                    'legal_first_name' => ($this->legal_first_name != null) ? $this->legal_first_name : '',
                    'legal_last_name' => ($this->legal_last_name != null) ? $this->legal_last_name : '',
                    'gender' => $this->gender,
                    'image' => $this->avatar,
                    'desc' => ($this->child_description != null) ? $this->child_description : '',
                    'attendance' => $this->getAttendance($this->attendance),
                    'crn' => $this->ccs_id,
                    //
                    'dob' => DateTimeHelper::getDateFormat($this->dob),
                    'join' => DateTimeHelper::getDateFormat($this->join_date),
                    'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateString() : '',
                    //
                    'home_address' => $this->home_address,
                    'suburb' => $this->suburb,
                    'state' => $this->state,
                    'postalcode' => $this->postalcode,
                    'court_orders' => $this->court_orders,
                    //
                    'status' => $this->status,
                    'nappy_required' => ($this->nappy_option_required == '1') ? true : false,
                    'bottle_feed_required' => ($this->bottle_feed_option_required == '1') ? true : false,
                    'has_allergies_medications' => false,
                    //
                    // 'rooms' => new RoomResourceCollection($this->whenLoaded('rooms')),
                    'room' => $this->getRoomListName($this->rooms),
                    'enrollments' => new CCSEnrolmentResourceCollection($this->whenLoaded('ccs_enrolment')),
                    'emergency' => new EmergencyContactCollection($this->whenLoaded('emergencyContacts')),
                    'cultural' => new CulturalDetailsResource($this->whenLoaded('cultural_details')),
                    'documents' => new ChildDocumentsResource($this->whenLoaded('documents')),
                    'creator' => New UserResource($this->whenLoaded('creator'), [ 'basic' => true ]),
                    //
                    'crn' => $this->ccs_id,
                    'child_profile_image' => $this->child_profile_image,
                    'age' => $this->getAge($this->dob),
                    'is_birthday' => (DateTimeHelper::getTimezoneDatetime($this->dob, auth()->user()->timezone)->format('m-d') === DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone)->format('m-d')),

                    'parentsFirstName' => $parent->first_name,
                    'parentsLastName' => $parent->last_name,
                    'parentsHomeAddress' => $parent->home_address,
                    'parentsHomeDOB' => $parent->dob,

                    'parentsGender' => $parent->gender,
                    'parentsRelationship' => '',
                    'parentsPhoneNumber' => $parent->phone2,
                    'parentsMobile' => $parent->phone,
                    'parentsEmail' => $parent->email,
                    'parentsOccupation' => '',
                    'parentsAddress2' => $parent->address2,
                    'parentsSecondaryEmail' => $parent->secondary_email,

                    'WorkParentsPhoneNumber' => $parent->work_phone,
                    'WorkParentsMobile' => $parent->work_mobile,
                    'pincode' => $parent->pincode,
                ];

                array_push($prop, $data);
            }

        }
        else if(array_key_exists('CECR', $this->params) && $this->params['CECR'])
        {
            $prop = [
                'id' => $this->index,
                'f_name'=> $this->child->first_name,
                'ef_name' => $this->first_name,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'F') : '',
                'el_name' => $this->last_name,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'L') : '',
                'home_address_e' => $this->home_address, //? $this->getEmergancyDetails($this->emergency, 'ADD') : '',
                'mobile_number_e' => $this->phone,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'PHONE') : '',
                'email_e' => $this->email === 'noreply@kinderm8.com.au'? 'N/A' : $this->email,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'EMAIL') : '',
                'relationship' => $this->relationship,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'REL') : '',
                'type' => $this->type,//$this->emergency? $this->getEmergancyDetails($this->emergency, 'TYPE') : '',
                'pincode' =>  $this->user->pincode,//$this->parents ? $this->getParentPincode($this->parents) : null,
                'phone_number' => $this->phone2,
                'l_name'=> $this->child->last_name,
            ];
        }
        else if(array_key_exists('EDR', $this->params) && $this->params['EDR'])
        {
            $prop = [
                'id' => $this->index,
                'first_name_p' => $this->first_name? $this->first_name : '',
                'last_name_p' => $this->last_name? $this->last_name : '',
                'home_address_p' => $this->address1? $this->address1 : '',
                'phone_p' => $this->phone_number? $this->phone_number : '',
                'gender_p' => $this->gender? $this->gender : '',
                'date_joined_user' => $this->created_at? DateTimeHelper::getDateFormat($this->created_at) : '',

            ];
        }
        else if(array_key_exists('EQR', $this->params) && $this->params['EQR'])
        {
            $prop = [
                'id' => $this->index,
                'first_name_p' => $this->first_name? $this->first_name : '',
                'last_name_p' => $this->last_name? $this->last_name : '',
                'home_address_p' => $this->address1? $this->address1 : '',
                'phone_p' => $this->phone_number? $this->phone_number : '',
                'gender_p' => $this->gender? $this->gender : '',
                'date_joined_user' => $this->created_at? DateTimeHelper::getDateFormat($this->created_at) : '',
                'kiosk_setup' => $this->kiosk_setup,

            ];
        }
        else
        {
            $prop = [];
        }

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }

    function getAge($dob)
    {
        $dt = DateTimeHelper::getTimezoneDatetime($dob, auth()->user()->timezone)
            ->diff(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone));

        return $dt->format('%y years, %m months and %d days');
    }

    function setJoinStatus($join)
    {
        try
        {
            if($join)
            {
                if(DateTimeHelper::getTimezoneDatetime($join, auth()->user()->timezone)->gt(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone)))
                {
                    $label = LocalizationHelper::getTranslatedText('child.join') . DateTimeHelper::getTimezoneDatetime($join, auth()->user()->timezone)->toDateString();
                    $icon = 'calendar check outline';
                    $color = '#FF9500';
                }
                else
                {
                    $label = LocalizationHelper::getTranslatedText('child.joined') . DateTimeHelper::getTimezoneDatetime($join, auth()->user()->timezone)->toDateString();
                    $icon = 'calendar alternate outline';
                    $color = '#4CAF50';
                }
            }
            else
            {
                $label = LocalizationHelper::getTranslatedText('child.not_yet_joined');
                $icon = 'calendar outline';
                $color = '#e74c3c';
            }
        }
        catch(Exception $e)
        {
            $label = '';
            $color = '';
            $icon = '';
        }

        return [
            'color' => $color,
            'label' => $label,
            'icon' => $icon
        ];
    }

    function getAttendance($attendance)
    {
        $attendance_array = [];
        foreach($attendance as $att) {
            array_push($attendance_array,strtoupper(substr($att['name'], 0, 2)));
        }

         return $str_Names=implode(" | ", $attendance_array);
    }

    function getParentName($userList, $type) {
        $user_array = [];
        foreach($userList as $att) {
            if($type === 'FIRST'){
                array_push($user_array,$att['first_name']);
            }

            else if($type === 'LAST') {
                array_push($user_array,$att['last_name']);
            }

            else {

            }

        }

         return $str_Names=implode(" | ", $user_array);
    }

    function getParentHomeAddress($userList, $type) {
        $user_array = [];
        foreach($userList as $att) {

                array_push($user_array, $type === '1' ?( $att['address1'] ? $att['address1'] : 'N/A') : ($att['address2'] ? $att['address2'] : 'N/A'));

            }

         return $str_Names=implode(" | ", $user_array);
    }

    function getParentDOB($userList) {
        $user_array = [];
        foreach($userList as $att) {

                array_push($user_array, $att['dob'] ? $att['dob'] : 'N/A');

            }

         return $str_Names=implode(" | ", $user_array);
    }

    function getParentEmail($userList, $type) {
        $user_array = [];
        foreach($userList as $att) {

            array_push($user_array, $type === '1' ? $att['email'] :( $att['secondary_email'] ? $att['secondary_email'] : 'N/A'));

            }

         return $str_Names=implode(" | ", $user_array);
    }

    function getParentPincode($userList) {
        $user_array = [];
        foreach($userList as $att) {

            $att['pincode'] ? array_push($user_array, $att['pincode']) : 'N/A';

            }

         return $str_Names=implode(" | ", $user_array);
    }


    function getParentGender($userList) {
        $user_array = [];
        foreach($userList as $att) {

            array_push($user_array, $att['gender'] ? $att['gender'] : 'N/A');

            }

         return $str_Names=implode(" | ", $user_array);
    }
    function getParentRelationship($userList) {
        $user_array = [];
        foreach($userList as $att) {

            array_push($user_array, $att['gender'] ? $att['gender'] : 'N/A');

            }

         return $str_Names=implode(" | ", $user_array);
    }

    function getParentPhone($userList, $type) {
        $user_array = [];
        foreach($userList as $att) {

            array_push($user_array, $att[$type] ? $att[$type] : 'N/A');

            }

         return $str_Names=implode(" | ", $user_array);
    }


    function getRoomListName($roomList) {
        $room_array = [];
        foreach($roomList as $att) {

            array_push($room_array, $att['title'] ? $att['title'] : 'N/A');

            }

         return $str_Names=implode(" | ", $room_array);
    }

    function getEmergancyDetails($userList, $type) {
        $user_array = [];
        foreach($userList as $att) {

            if($type === 'F'){
                array_push($user_array, $att['first_name'] ? $att['first_name']: 'N/A');
            }
            else if($type === 'L'){
                array_push($user_array, $att['last_name'] ? $att['last_name'] : 'N/A');
            }
            else if($type === 'ADD'){
                array_push($user_array, $att['address'] ? $att['address'] : 'N/A');
            }
            else if($type === 'PHONE') {
                array_push($user_array, $att['phone'] ? $att['phone'] : 'N/A');
            }
            else if($type === 'EMAIL') {
                array_push($user_array, $att['email'] ? $att['email'] : 'N/A');
            }
            else if($type === 'REL') {
                array_push($user_array, $att['relationship'] ? $att['relationship'] : 'N/A');
            }
            else if($type === 'TYPE') {

                if (is_null($att['types']))
                {
                    array_push($user_array, 'N/A');
                }
                else {
                    foreach($att['types'] as $type) {

                        array_push($user_array, $type? $type : 'N/A');

                        }
                }

            }
        }


         return $str_Names=implode(" | ", $user_array);
    }








}
