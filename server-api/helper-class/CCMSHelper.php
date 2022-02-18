<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\ServiceSetup;
use Pdp\Exception;
use Ramsey\Uuid\Uuid;
// use LocalizationHelper;

use function _\trim;

class CCMSHelper
{

    public static function ccmsTransactionID(Request $request)
    {

        Log::info('----------CCMS Request------------');

        $id = Uuid::uuid4()->toString();

        Log::info('TransactionID: ' . $id);
        Log::info($request->url());
        Log::info($request->all());

        return $id;

    }

    public static function getCCMSAuth(ServiceSetup $service)
    {

        $user_name = null;
        $password = null;
        $auth_person_id = null;
        $auth_person_first_name = null;
        $auth_person_last_name = null;

        if ($service['credentials'] && is_array($service['credentials'])) {

            $credential_array = $service['credentials'];

            if (array_key_exists('username', $credential_array) && $credential_array['username']) {
                $user_name = $credential_array['username'];
            }

            if (array_key_exists('password', $credential_array) && $credential_array['password']) {
                $password = Crypt::decryptString($credential_array['password']);
            }

            if (array_key_exists('authpersonid', $credential_array) && $credential_array['authpersonid']) {
                $auth_person_id = $credential_array['authpersonid'];
            }

            if (array_key_exists('authpersonfname', $credential_array) && $credential_array['authpersonfname']) {
                $auth_person_first_name = $credential_array['authpersonfname'];
            }

            if (array_key_exists('authpersonlname', $credential_array) && $credential_array['authpersonlname']) {
                $auth_person_last_name = $credential_array['authpersonlname'];
            }

        }

        if (!$user_name || !$password || !$auth_person_first_name || !$auth_person_last_name || !$auth_person_id) {
            throw new Exception(LocalizationHelper::getTranslatedText('ccms.empty_auth'), 1000);
        } else {
            return [
                'user_name' => $user_name,
                'password' => $password,
                'auth_person_id' => $auth_person_id,
                'auth_person_first_name' => $auth_person_first_name,
                'auth_person_last_name' => $auth_person_last_name,
            ];
        }

    }

    public static function formatInclusiveSupportCase($response)
    {

        $data = $response;
        $enrolment_map = [];
        $enrolments = [];

        if (array_key_exists('ListOfISCases', $data) && $data['ListOfISCases']) {

            if (array_key_exists('ISCase', $data['ListOfISCases']) && $data['ListOfISCases']['ISCase']) {

                foreach ($data['ListOfISCases']['ISCase'] as $case_key => $case) {

                    if (array_key_exists('ListOfISEnrolments', $case) && $case['ListOfISEnrolments']) {

                        if (array_key_exists('ISEnrolment', $case['ListOfISEnrolments']) && $case['ListOfISEnrolments']['ISEnrolment']) {

                            $enrolment_map = array_map(function ($enrol_item) {
                                return [
                                    'enrolment_id' => $enrol_item['EnrolmentId'],
                                    'child_id' => $enrol_item['ChildId']
                                ];
                            }, $case['ListOfISEnrolments']['ISEnrolment']);

                            $enrolments = app(ICCSEnrolmentRepository::class)->with('child')->whereIn('enrolment_id', array_column($enrolment_map, 'enrolment_id'))->get()->toArray();

                            $data['ListOfISCases']['ISCase'][$case_key]['ListOfISEnrolments']['ISEnrolment'] = array_map(function ($mod_data) use($enrolments) {

                                $ind = array_search($mod_data['EnrolmentId'], array_column($enrolments, 'enrolment_id'));

                                $modified_obj = [
                                    'EnrolmentId' => $mod_data['EnrolmentId'],
                                    'ServiceProviderEnrolmentReference' => $mod_data['ServiceProviderEnrolmentReference'],
                                    'ChildId' => $mod_data['ChildId'],
                                    'ChildServiceClientId' => $mod_data['ChildServiceClientId'],
                                    'ChildCRN' => $mod_data['ChildCRN'],
                                    'ChildDateOfBirth' => $mod_data['ChildDateOfBirth'],
                                    'ChildName' => $ind === false ? '' : $enrolments[$ind]['child']['first_name'] . ' ' . $enrolments[$ind]['child']['last_name']
                                ];

                                return $modified_obj;

                            }, $case['ListOfISEnrolments']['ISEnrolment']);

                        }

                    }

                    if (array_key_exists('ListOfDays', $case) && $case['ListOfDays']) {

                        if (array_key_exists('Day', $case['ListOfDays']) && $case['ListOfDays']['Day']) {

                            $data['ListOfISCases']['ISCase'][$case_key]['ListOfDays']['Day'] = array_map(function ($mod_data) use($enrolments, $enrolment_map) {

                                $map_ind = array_search($mod_data['ChildId'], array_column($enrolment_map, 'child_id'));
                                $day_ind = $map_ind === false ? false : array_search($enrolment_map[$map_ind]['enrolment_id'], array_column($enrolments, 'enrolment_id'));

                                $modified_obj = [
                                    'ChildId' => $mod_data['ChildId'],
                                    'DayOfCare' => $mod_data['DayOfCare'],
                                    'PaymentType' => $mod_data['PaymentType'],
                                    'VariableWeek' => $mod_data['VariableWeek'],
                                    'ChildName' => $day_ind === false ? '' : $enrolments[$day_ind]['child']['first_name'] . ' ' . $enrolments[$day_ind]['child']['last_name']
                                ];

                                return $modified_obj;

                            }, $case['ListOfDays']['Day']);

                        }

                    }

                }

            }

        }

        return $data;

    }

}
