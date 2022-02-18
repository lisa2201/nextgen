<?php

namespace Kinderm8\Http\Resources;

use Carbon\Carbon;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use LocalizationHelper;

class ChildResource extends JsonResource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @param array $params
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

        if (array_key_exists('basic', $this->params) && $this->params['basic'])
        {
            $timezone = (!isset(auth()->user()->timezone)) ? 'Australia/NSW' : auth()->user()->timezone;

            $prop = [
                'id' => $this->index,
                'f_name' => $this->first_name,
                'l_name' => $this->last_name,
                'm_name' => ($this->middle_name != null) ? $this->middle_name : '',
                'status' => $this->status,
                'dob' => DateTimeHelper::getDateFormat($this->dob),
                'age' => $this->getAge($this->dob),
                'is_birthday' => (DateTimeHelper::getTimezoneDatetime($this->dob, $timezone)->format('m-d') === DateTimeHelper::getTimezoneDatetime(Carbon::now(), $timezone)->format('m-d')),
                'crn' => $this->ccs_id,
                'child_profile_image' => $this->child_profile_image,
                //
                $this->mergeWhen(array_key_exists('absence_count', $this->params) && $this->params['absence_count'], function () {
                    return [
                        'absence_count' => $this->params['absence_count'],
                        'absence_remaining' => (42 - $this->params['absence_count']),
                    ];
                }),
                //
                'documents' => new ChildDocumentsResource($this->whenLoaded('documents'))
            ];
        }
        else if(array_key_exists('short', $this->params) && $this->params['short'])
        {
            $prop = [
                'id' => $this->index,
                'f_name' => $this->first_name,
                'l_name' => $this->last_name,
                'm_name' => ($this->middle_name != null) ? $this->middle_name : '',
                'status' => $this->status,
                'child_profile_image' => $this->child_profile_image,
            ];
        }
        else
        {
            $prop = [
                'id' => $this->index,
                'f_name' => $this->first_name,
                'l_name' => $this->last_name,
                'm_name' => ($this->middle_name != null) ? $this->middle_name : '',
                'legal_first_name' => ($this->legal_first_name != null) ? $this->legal_first_name : '',
                'legal_last_name' => ($this->legal_last_name != null) ? $this->legal_last_name : '',
                'gender' => $this->gender,
                'image' => $this->avatar,
                'desc' => ($this->child_description != null) ? $this->child_description : '',
                'attendance' => $this->attendance,
                'crn' => $this->ccs_id,
                //
                'dob' => DateTimeHelper::getDateFormat($this->dob),
                'join' => DateTimeHelper::getDateFormat($this->join_date),
                'account_created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, auth()->user()->timezone)->toDateString() : '',
                'child_profile_image' => $this->child_profile_image,
                'age' => $this->getAge($this->dob),
                'is_birthday' => (DateTimeHelper::getTimezoneDatetime($this->dob, auth()->user()->timezone)->format('m-d') === DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone)->format('m-d')),
                //
                'home_address' => $this->home_address,
                'suburb' => $this->suburb,
                'state' => $this->state,
                'postalcode' => $this->postalcode,
                'court_orders' => $this->court_orders,
                //
                'status' => $this->status,
                'nappy_required' => $this->nappy_option_required === '1',
                'bottle_feed_required' => $this->bottle_feed_option_required === '1',
                'has_allergies_medications' => false,
                //
                'rooms' => new RoomResourceCollection($this->whenLoaded('rooms')),
                'parents' => new UserResourceCollection($this->whenLoaded('parents'), [ 'basic' => true, 'withPrimaryPayer' => true ]),
                'enrollments' => new CCSEnrolmentResourceCollection($this->whenLoaded('ccs_enrolment')),
                'emergency' => new EmergencyContactCollection($this->whenLoaded('emergencyContacts')),
                'cultural' => new CulturalDetailsResource($this->whenLoaded('cultural_details')),
                'documents' => new ChildDocumentsResource($this->whenLoaded('documents')),
                'notes' => new WaitlistNoteResourceCollection($this->whenLoaded('notes')),
                'consents' => new ChildConsentsResourceCollection($this->whenLoaded('consents')),
                'creator' => New UserResource($this->whenLoaded('creator'), [ 'basic' => true ]),
                'health_medical' => New HealthAndMedicalResource($this->whenLoaded('health_medical')),
                'bus' => new ChildSchoolBusResourceCollection($this->whenLoaded('school_bus')),
                'allergy' => new AllergyResourceCollection($this->whenLoaded('allergy')),
                'deleted_on'=> $this->deleted_at
                //'immunisation_tracking' => $this->immunisation_tracking
            ];
        }

        if (array_key_exists('withRooms', $this->params) && $this->params['withRooms'])
        {
            $prop['rooms'] = new RoomResourceCollection($this->whenLoaded('rooms'));
        }

        $prop['attr_id'] = Helpers::generateSerialCode();

        return $prop;
    }

    function getAge($dob)
    {
        $timezone = (!isset(auth()->user()->timezone)) ? 'Australia/NSW' : auth()->user()->timezone;

        $dt = DateTimeHelper::getTimezoneDatetime($dob, $timezone)->diff(DateTimeHelper::getTimezoneDatetime(Carbon::now(), $timezone));

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
            array_push($attendance_array,$att['name']);
        }

        return $str_Names=implode(" | ", $attendance_array);
    }
}
