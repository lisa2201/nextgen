<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use GuzzleHttp\Client;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Kinderm8\CareProvidedVacancy;
use Kinderm8\Branch;
use Kinderm8\Enums\RequestType;
use Kinderm8\ServiceSetup;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\CareProvidedResourceCollection;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Enums\AWSConfigType;
use DateTimeHelper;
use Kinderm8\Services\AWS\SNSContract;

class CareProvidedVacancyController extends Controller
{

    private $snsService;

    public function __construct(SNSContract $snsService)
    {
        $this->snsService = $snsService;
    }

    public function save_request(Request $request)
    {

        $input_fee_details = $request->input('feedetails');
        $session_types = array('HOURLY','HALFDY','FULLDY','BEFSCH','AFTSCH');
        $inclusion_texts = array('BRKFST', 'MORTEA', 'LUNCH', 'AFTTEA', 'OTHMEA', 'NAPPIE', 'TRANSP', 'EDUPRO', 'EXCINC');
        $agegroups =  array('0012MN','1324MN','2535MN','36MNPR','OVPRAG');
        $vacancy_types = array('casual','permanent');

        $now = Carbon::now();
        $CurrentweekStartDate = $now->startOfWeek()->format('Y-m-d');
        $date_of_event = $now->format('Y-m-d');
        $weekStartDate =explode('T', $request->input('week_pick'))[0];

        $branch = Branch::find(auth()->user()->branch_id);
        $service = ServiceSetup::find($branch->service_id);


        //fees

        $fee_url = $request->input('fee_url');
        $session_fees = array();

        if($fee_url == '' || $fee_url == null) {

            $fee_url = '';
            foreach ($session_types as $session_type) {
                $fee_details = array();
                foreach ($input_fee_details as $input_fee_detail) {
                    if ($session_type == $input_fee_detail['session_type']) {
                        array_push($fee_details, $input_fee_detail);
                    }
                }

                if (count($fee_details) > 0) {
                    $session_age_groups = array();
                    foreach ($agegroups as $agegroup) {
                        foreach ($fee_details as $fee_detail) {

                            if ($agegroup == $fee_detail['age_group']) {

                                $inclusionCode = array();
                                foreach ($inclusion_texts as $inclusion_text) {
                                    if ($fee_detail[$inclusion_text] == true) {
                                        array_push($inclusionCode, array(
                                            'inclusionCode' => $inclusion_text
                                        ));
                                    }
                                }

                                $amount = $fee_detail['fee_amount'];
                                $temp3 = array(
                                    'ageGroup' => $fee_detail['age_group'],
                                    'usualFeeAmount' => "$amount",
                                    'Inclusions' => $inclusionCode
                                );

                                array_push($session_age_groups, $temp3);
                            }
                        }
                    }

                    $temp1 = array(
                        'sessionType' => $session_type,
                        'AgeGroups' => $session_age_groups
                    );
                    array_push($session_fees, $temp1);
                }
            }
        }

        $fees = [
            'dateOfEvent' => $date_of_event,
            'feeURL' => $fee_url,
            'SessionFees' => (strlen($fee_url)> 0)? '': $session_fees
        ];


        //vacancies
        $prefix = '';
        if($CurrentweekStartDate != $weekStartDate){
            $prefix = 'next_';
            $vacancies = $request->input('vacanciesnext');
        }else{
            $vacancies = $request->input('vacancies');
        }

        $daily_vacancies  = array();

        for($i=1; $i<8; $i++){

            $all_true = 0;
            for($l=1; $l<6; $l++){
                if($vacancies[$i-1][$prefix.'agegroup'.$l] == 'true'){
                    $all_true++;
                }
            }

            $all_sessions_true = 0;
            foreach ($session_types as $k => $session_type) {
                if ($vacancies[$i - 1][$prefix . 'sessiontype' . ($k + 1)] == 'true') {
                    $all_sessions_true++;
                }
            }

            $all_vacancies_true = 0;
            foreach ($vacancy_types as $vacancy_type) {
                if ($vacancies[$i - 1][$prefix . $vacancy_type] == 'true') {
                    $all_vacancies_true++;
                }
            }


            if($all_true == 5 && $all_sessions_true == 5 && $all_vacancies_true == 2){
                $areVacanciesAvailable = 'Y';
            }else if($all_true == 0){
                $areVacanciesAvailable = 'N';
            }else{
                $areVacanciesAvailable = '';
            }

            $sessions_array = array();
            if($areVacanciesAvailable == '') {

                foreach ($session_types as $k => $session_type) {

                    if ($vacancies[$i - 1][$prefix . 'sessiontype' . ($k + 1)] == 'true') {

                        $session_vacancies = array();
                        foreach ($vacancy_types as $vacancy_type) {

                            $session_agegroups = array();
                            for ($j = 1; $j < 6; $j++) {

                                if ($vacancies[$i - 1][$prefix . 'agegroup' . $j] == 'true') {
                                    $temp2 = [
                                        'ageGroup' => $agegroups[$j - 1],
                                        'areVacanciesAvailable' => ($vacancies[$i - 1][$prefix . $vacancy_type] == 'true') ? true : false
                                    ];

                                    array_push($session_agegroups, $temp2);
                                }
                            }

                            $temp = [
                                'vacancyType' => ($vacancy_type == 'casual') ? 'CASUAL' : 'PRMNT',
                                'SessionAgeGroups' => $session_agegroups
                            ];

                            array_push($session_vacancies, $temp);
                        }

                        $sessions = [
                            'sessionType' => $session_type,
                            'SessionVacancies' => $session_vacancies
                        ];

                        array_push($sessions_array, $sessions);
                    }
                }

            }

            if(($areVacanciesAvailable == '')){
                $day =[
                    'day' => "$i",
                    'areVacanciesAvailable' => $areVacanciesAvailable,
                    'Sessions' => $sessions_array
                ];
            }else{
                $day =[
                    'day' => "$i",
                    'areVacanciesAvailable' => $areVacanciesAvailable
                ];
            }

            array_push($daily_vacancies, $day);
        }

        $vacancies = array(
            'CCSWeekStartDate' => $weekStartDate,
            'Days' => $daily_vacancies
        );


        //operation details
        $operationaldetails = $request->input('operationaldetails');
        $opening_days_array = array();

        if($service->service_type == 'ZOSH'){
            $branch_servicetype = 'OSHBSC';
        }else{
            $branch_servicetype = 'NONOSH';
        }

        for($i=1; $i<8; $i++){

            $marked = false;
            $operationalservice_array = array();

            foreach($operationaldetails as $workingday){

                if($workingday['operational_day'] == $i){
                    $operationalservices = $workingday['operationalservices'];

                    foreach($operationalservices as $operationalservice){
                        if($operationalservice['service_offered'] != '' ) {
                            $service_slot = [
                                'openTime' => ($operationalservice['open_time'] != '') ? DateTimeHelper::formatTimeArrayToMin($operationalservice['open_time'], 'H:i:s') : '',
                                'closeTime' => ($operationalservice['end_time'] != '') ? DateTimeHelper::formatTimeArrayToMin($operationalservice['end_time'], 'H:i:s') : '',
                                'serviceBeingOffered' => $operationalservice['service_offered'],
                                'isCentreOpen' => 'Y'
                            ];

                            array_push($operationalservice_array, $service_slot);
                        }
                    }
                    $marked = true;
                }
            }

            if(!$marked){

                $service_slot = [
                    'openTime' => '',
                    'closeTime' => '',
                    'serviceBeingOffered' => $branch_servicetype,
                    'isCentreOpen' => 'N'
                ];

                array_push($operationalservice_array, $service_slot);
            }

            $operational_day = [
                'day' => "$i",
                'OpenCloses' => $operationalservice_array
            ];

            array_push($opening_days_array, $operational_day);
        }

        $operationaldetails = array(
            'dateOfEvent' => $date_of_event,
            'OperationalDays' => $opening_days_array
        );


        //contacts
        $contacts = array(
            'email' => Helpers::IsNullOrEmpty($request->input('email')) ? '' : $request->input('email'),
            'phone' => Helpers::IsNullOrEmpty($request->input('phone')) ? '' : $request->input('phone'),
            'mobile' => Helpers::IsNullOrEmpty($request->input('mobile')) ? '' : $request->input('mobile'),
            'serviceURL' => Helpers::IsNullOrEmpty($request->input('service_url')) ? '' : $request->input('service_url')
        );

        $object = [
            'serviceID' => "$service->service_id",
            'Fees'=> $fees,
            'Vacancies'=> $vacancies,
            'OperationalDetails'=> $operationaldetails,
            'Contacts'=> $contacts
        ];

        $week_record = CareProvidedVacancy::where('week_start',$weekStartDate)->where('branch_id',auth()->user()->branch_id)->first();
        $last_week_record = CareProvidedVacancy::where('branch_id',auth()->user()->branch_id)->orderBy('week_start', 'desc')->first();

        \Log::info($week_record);
        \Log::info($last_week_record);
        DB::beginTransaction();

        try {

            if($week_record != null){

                $week_record->request = $object;
                $week_record->created_by = auth()->user()->id;
                $week_record->update();

            }else{

                $cp_vacancy = new CareProvidedVacancy();
                $cp_vacancy->organization_id = auth()->user()->organization_id;
                $cp_vacancy->branch_id = auth()->user()->branch_id;
                $cp_vacancy->week_start = $weekStartDate;
                $cp_vacancy->request = $object;
                $cp_vacancy->created_by = auth()->user()->id;
                $cp_vacancy->save();

            }

            if($last_week_record){
                if($last_week_record->week_start != $weekStartDate){

                    $data = $last_week_record['request'];

                    $data_new = [
                        'serviceID' => "$branch->service_id",
                        'Fees'=> $fees,
                        'Vacancies'=> $data['Vacancies'],
                        'OperationalDetails'=> $operationaldetails,
                        'Contacts'=> $contacts
                    ];
                    $last_week_record->request = $data_new;
                    $last_week_record->save();
                }
            }

            // $sns = new SnsClient([
            //     'region' => config('aws.region'),
            //     'version' => "2010-03-31",
            //     'credentials' => new Credentials(
            //         config('aws.access_key'),
            //         config('aws.secret_key')
            //     )
            // ]);

            $message = json_encode([
                "organization" => auth()->user()->organization_id,
                "branch" => auth()->user()->branch_id,
                "subjectid" => ($week_record != null)? $week_record->id : $cp_vacancy->id,
                "authpersonid" => auth()->user()->ccs_id,
                "action" => "New vancancy"
            ]);

            \Log::info($message);

            // $result = $sns->publish([
            //     'Message' => $message,
            //     'TopicArn' => Helpers::getConfig('care_provided_vacancy', AWSConfigType::SNS),
            //     'Subject' => 'New vancancy'
            // ]);


            $this->snsService->publishEvent(
                Helpers::getConfig('care_provided_vacancy', AWSConfigType::SNS),
                [
                "organization" => auth()->user()->organization_id,
                "branch" => auth()->user()->branch_id,
                "subjectid" => ($week_record != null)? $week_record->id : $cp_vacancy->id,
                "authpersonid" => auth()->user()->ccs_id,
                "action" => "New vancancy"
                ],
                'New vancancy'
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    "Care provided and vacancy details successfully updated"
                ),
                RequestType::CODE_201
            );

        } catch (Exception $e) {
            DB::rollBack();
            return false;
        }
    }

    public function get()
    {
        try {

            $branch = auth()->user()->branch_id;
            $record = CareProvidedVacancy::where('branch_id',$branch)->orderBy('week_start', 'desc')->orderBy('updated_at', 'desc')->limit(2)->get();

            return (new CareProvidedResourceCollection($record))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

}
