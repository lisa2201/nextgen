<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;
use DateTimeHelper;

class CareProvidedResource extends JsonResource
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
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {

        $content = $this->request;

        $prop = [
            'email' => $content['Contacts']['email'],
            'phone' => $content['Contacts']['phone'],
            'mobile' => $content['Contacts']['mobile'],
            'service_url' => $content['Contacts']['serviceURL'],
            'operationaldetails' => $this->operational_days($content['OperationalDetails']),
            'fee_type' => ($content['Fees']['feeURL'] == null)? 'fee_details' : 'fee_url',
            'fee_url' => $content['Fees']['feeURL'],
            'feedetails' => $this->fee_details($content['Fees']['SessionFees']),
            'vacancies' => $this->vacancies('current', $content['Vacancies']),
            'vacanciesnext' => $this->vacancies('next', $content['Vacancies']),
            'week_pick'=> $this->week_start,
            'api_errors'=>  ($this->is_synced == 2)? $this->syncerror: null,
            'updated_at'=> $this->updated_at,
        ];
      
        $prop['check_all'] = $this->checked_all($prop['vacancies']);
        return $prop;

    }

    function fee_details($session_fees){

        $fee_details = array();

        foreach ($session_fees as $session) {

            foreach ($session['AgeGroups'] as $agegroup) {

                $selected_inclusions = array();

                foreach ($agegroup['Inclusions'] as $inclusion) {
                    array_push($selected_inclusions, $inclusion['inclusionCode']);
                }

                $temp = [
                    'age_group' => $agegroup['ageGroup'],
                    'session_type' => $session['sessionType'],
                    'fee_amount' => $agegroup['usualFeeAmount'],
                    'BRKFST' => (in_array('BRKFST', $selected_inclusions)) ? true : false,
                    'MORTEA' => (in_array('MORTEA', $selected_inclusions)) ? true : false,
                    'LUNCH' => (in_array('LUNCH', $selected_inclusions)) ? true : false,
                    'AFTTEA' => (in_array('AFTTEA', $selected_inclusions)) ? true : false,
                    'OTHMEA' => (in_array('OTHMEA', $selected_inclusions)) ? true : false,
                    'NAPPIE' => (in_array('NAPPIE', $selected_inclusions)) ? true : false,
                    'TRANSP' => (in_array('TRANSP', $selected_inclusions)) ? true : false,
                    'EDUPRO' => (in_array('EDUPRO', $selected_inclusions)) ? true : false,
                    'EXCINC' => (in_array('EXCINC', $selected_inclusions)) ? true : false,
                ];
                array_push($fee_details, $temp);
            }
        }
        return $fee_details;
    }

    function vacancies($week,$vacancies){

        $vacancy_details = array();

        for($i=0; $i<7; $i++){

            if($vacancies['Days'][$i]['areVacanciesAvailable'] == 'Y') {

                if($week == 'current') {
                    $temp = [
                        'agegroup1' => true,
                        'agegroup2' => true,
                        'agegroup3' => true,
                        'agegroup4' => true,
                        'agegroup5' => true,
                        'permanent' => true,
                        'casual' => true,
                        'sessiontype1' => true,
                        'sessiontype2' => true,
                        'sessiontype3' => true,
                        'sessiontype4' => true,
                        'sessiontype5' => true,
                    ];

                }else{
                    $temp = [
                        'next_agegroup1' => true,
                        'next_agegroup2' => true,
                        'next_agegroup3' => true,
                        'next_agegroup4' => true,
                        'next_agegroup5' => true,
                        'next_permanent' => true,
                        'next_casual' => true,
                        'next_sessiontype1' => true,
                        'next_sessiontype2' => true,
                        'next_sessiontype3' => true,
                        'next_sessiontype4' => true,
                        'next_sessiontype5' => true,
                    ];
                }

            }else{

                $items = array();

                if($vacancies['Days'][$i]['areVacanciesAvailable'] == '') {
                    foreach ($vacancies['Days'][$i]['Sessions'] as $sessions) {

                        if ($sessions['sessionType'] == 'HOURLY') {
                            array_push($items, 'sessiontype1');
                        } else if ($sessions['sessionType'] == 'HALFDY') {
                            array_push($items, 'sessiontype2');
                        } else if ($sessions['sessionType'] == 'FULLDY') {
                            array_push($items, 'sessiontype3');
                        } else if ($sessions['sessionType'] == 'BEFSCH') {
                            array_push($items, 'sessiontype4');
                        } else if ($sessions['sessionType'] == 'AFTSCH') {
                            array_push($items, 'sessiontype5');
                        }

                        foreach ($sessions['SessionVacancies'] as $session_vacancy) {
                            if ($session_vacancy['SessionAgeGroups'][0]['areVacanciesAvailable'] == true) {
                                if ($session_vacancy['vacancyType'] == 'PRMNT') {
                                    array_push($items, 'permanent');
                                } else if ($session_vacancy['vacancyType'] == 'CASUAL') {
                                    array_push($items, 'casual');
                                }
                            }

                            foreach ($session_vacancy['SessionAgeGroups'] as $agegroup) {
                                if ($agegroup['ageGroup'] == '0012MN') {
                                    if (!in_array('agegroup1', $items)) {
                                        array_push($items, 'agegroup1');
                                    }
                                } else if ($agegroup['ageGroup'] == '1324MN') {
                                    if (!in_array('agegroup2', $items)) {
                                        array_push($items, 'agegroup2');
                                    }

                                } else if ($agegroup['ageGroup'] == '2535MN') {
                                    if (!in_array('agegroup3', $items)) {
                                        array_push($items, 'agegroup3');
                                    }

                                } else if ($agegroup['ageGroup'] == '36MNPR') {
                                    if (!in_array('agegroup4', $items)) {
                                        array_push($items, 'agegroup4');
                                    }

                                } else if ($agegroup['ageGroup'] == 'OVPRAG') {
                                    if (!in_array('agegroup5', $items)) {
                                        array_push($items, 'agegroup5');
                                    }

                                }
                            }
                        }

                    }
                }

                if($week == 'current') {
                    $temp = [
                        'agegroup1' => (in_array('agegroup1', $items))? true : false,
                        'agegroup2' => (in_array('agegroup2', $items))? true : false,
                        'agegroup3' => (in_array('agegroup3', $items))? true : false,
                        'agegroup4' => (in_array('agegroup4', $items))? true : false,
                        'agegroup5' => (in_array('agegroup5', $items))? true : false,
                        'permanent' => (in_array('permanent', $items))? true : false,
                        'casual' => (in_array('casual', $items))? true : false,
                        'sessiontype1' => (in_array('sessiontype1', $items))? true : false,
                        'sessiontype2' => (in_array('sessiontype2', $items))? true : false,
                        'sessiontype3' => (in_array('sessiontype3', $items))? true : false,
                        'sessiontype4' => (in_array('sessiontype4', $items))? true : false,
                        'sessiontype5' => (in_array('sessiontype5', $items))? true : false,
                    ];

                }else{
                    $temp = [
                        'next_agegroup1' => (in_array('agegroup1', $items))? true : false,
                        'next_agegroup2' => (in_array('agegroup2', $items))? true : false,
                        'next_agegroup3' => (in_array('agegroup3', $items))? true : false,
                        'next_agegroup4' => (in_array('agegroup4', $items))? true : false,
                        'next_agegroup5' => (in_array('agegroup5', $items))? true : false,
                        'next_permanent' => (in_array('permanent', $items))? true : false,
                        'next_casual' => (in_array('casual', $items))? true : false,
                        'next_sessiontype1' => (in_array('sessiontype1', $items))? true : false,
                        'next_sessiontype2' => (in_array('sessiontype2', $items))? true : false,
                        'next_sessiontype3' => (in_array('sessiontype3', $items))? true : false,
                        'next_sessiontype4' => (in_array('sessiontype4', $items))? true : false,
                        'next_sessiontype5' => (in_array('sessiontype5', $items))? true : false,
                    ];
                }
            }

            array_push($vacancy_details, $temp);

        }

        return $vacancy_details;
    }

    function operational_days($days){

        $open_days = array();

        foreach($days['OperationalDays'] as $day){

           if ($day['OpenCloses'][0]['isCentreOpen'] == 'Y') {

               $daily_services = array();

                foreach ($day['OpenCloses'] as $opencloses) {

                    $openservice = [
                        'open_time' => ($opencloses['openTime'] != '') ? DateTimeHelper::convertTimeStringToMins($opencloses['openTime']): '',
                        'end_time' => ($opencloses['closeTime'] != '') ? DateTimeHelper::convertTimeStringToMins($opencloses['closeTime']): '',
                        'service_offered' => $opencloses['serviceBeingOffered'],
                        'isCentreOpen' => 'Y'
                    ];

                    array_push($daily_services, $openservice);
                }

               $temp = [
                   'operational_day' => $day['day'],
                   'operationalservices' => $daily_services

               ];
                array_push($open_days, $temp);
           }

        }

        return $open_days;
    }

    function checked_all($vacancies){

        $checked = true;
        $array_items = array('agegroup1','agegroup2','agegroup3','agegroup4','agegroup5','permanent','casual','sessiontype1','sessiontype2','sessiontype3','sessiontype4','sessiontype5');

        foreach($vacancies as $vacancy){

            if($checked == false){
                break;
            }

            foreach($array_items as $item){
                if($vacancy[$item] == false){
                    $checked = false;
                    break;
                }
            }

        }

        return $checked;
    }

}
