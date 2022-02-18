<?php

use Dompdf\Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\ServerException;
use Illuminate\Support\Collection;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\Repositories\User\IUserRepository;

class CCSHelpers
{
    /*------------------------- Api -----------------------------*/

    /**
     * get child enrolments
     * refer https://proitzen.atlassian.net/wiki/spaces/CCMSIN/pages/968720385/Enrolment+-+Read
     * @param $option
     * @return array | null
     * @throws Exception
     */
    public static function getChildEnrolment($option)
    {
        $authUser = app(IUserRepository::class)->with(['branch', 'branch.providerService'])->find(auth()->user()->id);

        // check if personal id exists
        if (Helpers::IsNullOrEmpty($authUser->ccs_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // check if provider service exists
        if (is_null($authUser->branch->providerService) || Helpers::IsNullOrEmpty($authUser->branch->providerService->service_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.service_provider_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $queryParams = [
            '$ccsserviceid' => $authUser->branch->providerService->service_id
        ];

        if (!is_null($option))
        {
            if (isset($option['ccsenrolmentid']) && !Helpers::IsNullOrEmpty($option['ccsenrolmentid']))
            {
                $queryParams['$ccsenrolmentid'] = $option['ccsenrolmentid'];
            }

            if (isset($option['ccsindividualcrn']) && !Helpers::IsNullOrEmpty($option['ccsindividualcrn']))
            {
                $queryParams['$ccsindividualcrn'] = $option['ccsindividualcrn'];
            }

            if (isset($option['ccschildcrn']) && !Helpers::IsNullOrEmpty($option['ccschildcrn']))
            {
                $queryParams['$ccschildcrn'] = $option['ccschildcrn'];
            }

            if (isset($option['ccsstartdate']) && !Helpers::IsNullOrEmpty($option['ccsstartdate']))
            {
                $queryParams['$ccsstartdate'] = $option['ccsstartdate'];
            }

            if (isset($option['ccsstatus']) && !Helpers::IsNullOrEmpty($option['ccsstatus']))
            {
                $queryParams['$ccsstatus'] = $option['ccsstatus'];
            }

            if (isset($option['ccshistory']) && !Helpers::IsNullOrEmpty($option['ccshistory']))
            {
                $queryParams['$ccshistory'] = $option['ccshistory'];
            }
        }

        // expand arrays
        $queryParams['$expand'] = 'Statuses,Sessions';

        try
        {
            $client = new Client(
                [
                    'headers' => [
                        'x-api-key' => config('aws.gateway_api_key'),
                        'authpersonid' => $authUser->ccs_id
                    ],
                    'query' => $queryParams
                ]);

            $response = $client->get(Helpers::getConfig('enrolment.read', AWSConfigType::API_GATEWAY));

            $body = json_decode((string) $response->getBody(), true);

            return $body['results'];
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * get enrollments by branch
     * @param $auth_person
     * @param $service
     * @return mixed
     * @throws Exception
     */
    public static function getEnrollmentsByBranch($auth_person, $service)
    {
        // check if personal id exists
        if(is_null($auth_person) || Helpers::IsNullOrEmpty($auth_person->person_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // check if provider service exists
        if(is_null($service) || Helpers::IsNullOrEmpty($service->service_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.service_provider_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $queryParams = [
            '$ccsserviceid' => $service->service_id,
            '$expand' => 'Statuses,Sessions'
        ];

        try
        {
            $client = new Client(
                [
                    'headers' => [
                        'x-api-key' => config('aws.gateway_api_key'),
                        'authpersonid' => $auth_person->person_id
                    ],
                    'query' => $queryParams
                ]);

            $response = $client->get(Helpers::getConfig('enrolment.read', AWSConfigType::API_GATEWAY));

            $body = json_decode((string) $response->getBody(), true);

            return $body['results'];
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * get enrolment entitlement submission
     * refer https://proitzen.atlassian.net/wiki/spaces/CCMSIN/pages/1058013185/Entitlement+-+Read
     * @param $option
     * @return null
     * @throws Exception
     */
    public static function getEnrolmentEntitlement($option)
    {
        $authUser = app(IUserRepository::class)->with(['branch', 'branch.providerService'])->find(auth()->user()->id);

        // check if personal id exists
        if(Helpers::IsNullOrEmpty($authUser->ccs_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // check if provider service exists
        if(is_null($authUser->branch->providerService) || Helpers::IsNullOrEmpty($authUser->branch->providerService->service_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.service_provider_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $queryParams = [
            '$ccsserviceid' => $authUser->branch->providerService->service_id
        ];

        if (!is_null($option))
        {
            if (isset($option['ccsenrolmentid']) && !Helpers::IsNullOrEmpty($option['ccsenrolmentid']))
            {
                $queryParams['$ccsenrolmentid'] = $option['ccsenrolmentid'];
            }

            if (isset($option['ccsdateofentitlement']) && !Helpers::IsNullOrEmpty($option['ccsdateofentitlement']))
            {
                $queryParams['$ccsdateofentitlement'] = $option['ccsdateofentitlement'];
            }
        }

        try
        {
            $client = new Client(
                [
                    'headers' => [
                        'x-api-key' => config('aws.gateway_api_key'),
                        'authpersonid' => $authUser->ccs_id
                    ],
                    'query' => $queryParams
                ]);

            $response = $client->get(Helpers::getConfig('enrolment.read_entitlement', AWSConfigType::API_GATEWAY));

            $body = json_decode((string) $response->getBody(), true);

            return $body['results'];
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * get session submission
     * refer https://proitzen.atlassian.net/wiki/spaces/CCMSIN/pages/1149927425/Session+Report-+Read
     * @param $option
     * @return null
     * @throws Exception
     */
    public static function getSessionSubmissionDetails($option)
    {
        $authUser = app(IUserRepository::class)->with(['branch', 'branch.providerService'])->find(auth()->user()->id);

        // check if personal id exists
        if (Helpers::IsNullOrEmpty($authUser->ccs_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // check if provider service exists
        if (is_null($authUser->branch->providerService) || Helpers::IsNullOrEmpty($authUser->branch->providerService->service_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.service_provider_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $queryParams = [
            '$ccsserviceid' => $authUser->branch->providerService->service_id
        ];

        if (!is_null($option))
        {
            if (isset($option['ccsenrolmentid']) && !Helpers::IsNullOrEmpty($option['ccsenrolmentid']))
            {
                $queryParams['$ccsenrolmentid'] = $option['ccsenrolmentid'];
            }

            if (isset($option['ccsstartdate']) && !Helpers::IsNullOrEmpty($option['ccsstartdate']))
            {
                $queryParams['$ccsstartdate'] = $option['ccsstartdate'];
            }

            if (isset($option['expand']) && !Helpers::IsNullOrEmpty($option['expand']))
            {
                $queryParams['$expand'] = 'Statuses,SessionOfCares,ChangeReasons,SessionOfCares/Attendances';
            }

            if (isset($option['ccshistory']) && !Helpers::IsNullOrEmpty($option['ccshistory']))
            {
                $queryParams['$ccshistory'] = $option['ccshistory'];
            }
        }

        try
        {
            $client = new Client(
                [
                    'headers' => [
                        'x-api-key' => config('aws.gateway_api_key'),
                        'authpersonid' => $authUser->ccs_id
                    ],
                    'query' => $queryParams
                ]);

            $response = $client->get(Helpers::getConfig('session_submission.read', AWSConfigType::API_GATEWAY));

            $body = json_decode((string) $response->getBody(), true);

            return $body['results'];
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * get ccs payment advise
     * refer https://proitzen.atlassian.net/wiki/spaces/CCMSIN/pages/1144913921/Payment-+Read
     * @param $filters
     * @param $format
     * @param $paginate
     * @param $offset
     * @param $page
     * @param bool $csv
     * @return null
     * @throws GuzzleException
     */
    public static function getCcsPayments($filters, $format, $paginate, $offset, $page, $csv = false)
    {
        $return_array = [];

        if (auth()->user()->isBranchUser()) {

            $service = app(IServiceRepository::class)->findByUser(auth()->user()->id, []);
            $ccsSetup = app(ICCSSetupRepository::class)->findByUser(auth()->user()->id, []);

        } else {
            // Site manager
            throw new Exception('Not allowed for site manager', 1000);
        }

        $service_id = $service->service_id;
        $person_id = $ccsSetup->person_id;

        $queryObj = [
            '$ccsserviceid' => $service_id,
            '$expand' => 'Items'
        ];

        if (!is_null($filters)) {

            if (isset($filters->start_date) && !empty($filters->start_date)) {
                $queryObj['$ccsdatepaid'] = $filters->start_date;

                if (isset($filters->end_date) && !empty($filters->end_date)) {
                    unset($queryObj['$ccsdatepaid']);
                    $queryObj['$ccsstartdate'] = $filters->start_date;
                    $queryObj['$ccsenddate'] = $filters->end_date;
                }

            }

            if (isset($filters->document_number) && !empty($filters->document_number)) {
                $queryObj['$clearingdocumentnumber'] = $filters->document_number;
            }

        }

        if ($paginate && isset($offset) && isset($page)) {
            $top = $offset;
            $skip = (($page - 1) * $offset);

            $queryObj['$inlinecount'] = "allpages";
            $queryObj['$top'] = $top;
            $queryObj['$skip'] = $skip;
        }

        try
        {
            $client = new Client();

            $url = Helpers::getConfig('payment_advise', 'end_points');

            $api_result = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => config('ccs-provider.api_key'),
                    'authpersonid' => $person_id
                ],
                'query' => $queryObj
            ]);

            if ($api_result->getStatusCode() == 200) {

                $api_data_body = $api_result->getBody()->getContents();
                $api_response = json_decode($api_data_body, true);

                if ($format) {

                    if ($csv) {
                        $return_array = self::formatCcsPaymentsCsv(self::formatCcsPayments($api_response, $csv));
                    } else {
                        $return_array = self::formatCcsPayments($api_response);
                    }

                } else {
                    $return_array = $api_response;
                }

            } else {
                throw new Exception('API Error');
            }

            return $return_array;
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * format ccs payments
     * @param $api_response
     * @param bool $csv
     * @return null
     */
    public static function formatCcsPayments($api_response, $csv = false)
    {

        $main_arr = [];

        if (array_key_exists('results', $api_response) && count($api_response['results']) > 0) {

            foreach ($api_response['results'] as $payment_header) {

                if (array_key_exists('Items', $payment_header) && array_key_exists('results', $payment_header['Items']) && count($payment_header['Items']['results']) > 0) {

                    $enrolments = app(ICCSEnrolmentRepository::class)->with(['child', 'parent'])
                        ->whereIn('enrolment_id', array_column($payment_header['Items']['results'], 'enrolmentID'))
                        ->get()
                        ->toArray();

                    $items_arr = [];

                    foreach ($payment_header['Items']['results'] as $item) {

                        $enrolment = array_search($item['enrolmentID'], array_column($enrolments, 'enrolment_id'));
                        $mainTransactionCode = $item['mainTransactionCode'];
                        $subTransactionCode = $item['subTransactionCode'];
                        $mainTransaction = isset(PaymentHelpers::CCS_PAYMENT_MAIN_TRANSACTION_MAP[$mainTransactionCode]) ? PaymentHelpers::CCS_PAYMENT_MAIN_TRANSACTION_MAP[$mainTransactionCode] : '';
                        $subTransaction = '';

                        if ($mainTransactionCode === 'Z401') {
                            $subTransaction = isset(PaymentHelpers::CCS_PAYMENT_SUB_TRANSACTION_MAP[$subTransactionCode]) ? PaymentHelpers::CCS_PAYMENT_SUB_TRANSACTION_MAP[$subTransactionCode] : '';
                        } else if ($mainTransactionCode === 'Z402') {
                            $subTransaction = isset(PaymentHelpers::ACCS_PAYMENT_SUB_TRANSACTION_MAP[$subTransactionCode]) ? PaymentHelpers::ACCS_PAYMENT_SUB_TRANSACTION_MAP[$subTransactionCode] : '';
                        } else {
                            $subTransaction = isset(PaymentHelpers::SUB_TRANSACTION_MAP[$subTransactionCode]) ? PaymentHelpers::SUB_TRANSACTION_MAP[$subTransactionCode] : '';
                        }

                        $gst = isset(PaymentHelpers::CCS_PAYMENT_GST_MAP[$item['GSTcode']]) ? PaymentHelpers::CCS_PAYMENT_GST_MAP[$item['GSTcode']] : '';

                        $parentName = $enrolment !== false ? $enrolments[$enrolment]['parent']['first_name']. ' ' .$enrolments[$enrolment]['parent']['last_name'] : '';
                        $childName = $enrolment !== false ? $enrolments[$enrolment]['child']['first_name']. ' ' .$enrolments[$enrolment]['child']['last_name'] : '';

                        if ($csv) {

                            array_push($main_arr, [
                                'serviceName' => $payment_header['serviceName'],
                                'serviceId' => $payment_header['serviceID'],
                                'clearingNumber' => $payment_header['clearingDocumentNumber'],
                                'clearingDocumentDate' => $payment_header['clearingDocumentDate'],
                                'fiscalYear' => $payment_header['paymentFiscalYear'],
                                'paymentBsb' => $payment_header['paymentBSB'],
                                'paymentAccountNumber' => $payment_header['paymentAccountNumber'],
                                'paymentAccountName' => $payment_header['paymentAccountName'],
                                'enrolmentId' => $item['enrolmentID'],
                                'childName' => $childName,
                                'parentName' => $parentName,
                                'weekStart' => $item['sessionReportStartDate'],
                                'postingDate' => $item['postingDate'],
                                'mainTransaction' => $mainTransaction,
                                'subTransaction' => $subTransaction,
                                'gstCode' => $gst,
                                'status' => $item['status'],
                                'amount' => $item['amount'],
                            ]);

                        } else {

                            $item['childName'] = $childName;
                            $item['parentName'] = $parentName;

                            $item['mainTransaction'] = $mainTransaction;
                            $item['subTransaction'] = $subTransaction;
                            $item['gst'] = $gst;

                            array_push($items_arr, $item);

                        }

                    }

                }

                if (!$csv) {

                    unset($payment_header['Items']);

                    $payment_header['Items'] = ["results" => $items_arr];

                    array_push($main_arr, $payment_header);

                }

            }

        }

        if ($csv) {
            return $main_arr;
        } else {
            return [
                "count" => array_key_exists('count', $api_response) &&  !empty($api_response['count']) ? (int) $api_response['count'] : 0,
                "results" => $main_arr
            ];
        }


    }

    /**
     * format ccs payments csv
     * @param $data
     * @return array
     */
    public static function formatCcsPaymentsCsv($data)
    {

        $return_array = [];

        if (count($data) > 0) {

            array_push($return_array, [
                'Service Name',
                'Service ID',
                'Clearning Number',
                'Clearing Document Date',
                'Fiscal Year',
                'Payment BSB',
                'Payment Account Number',
                'Payment Account Name',
                'Enrolment ID',
                'Child Name',
                'Parent Name',
                'Week Start',
                'Posting Date',
                'Main Transaction',
                'Sub Transaction',
                'GST',
                'Status',
                'Amount'
            ]);

            foreach ($data as $item) {

                $temp_arr = [];

                foreach ($item as $field) {
                    array_push($temp_arr, $field);
                }

                array_push($return_array, $temp_arr);

            }

        }

        return $return_array;

    }

    /**
     * get session subsidy
     * refer https://proitzen.atlassian.net/wiki/spaces/CCMSIN/pages/1134034995/Session+Subsidy-+Read
     * @param $filters
     * @param $format
     * @param $csv
     * @return null
     * @throws Exception
     * @throws GuzzleException
     */
    public static function getSessionSubsidy($filters, $format, $csv)
    {

        $return_array = [];

        if (auth()->user()->isBranchUser()) {

            $service = app(IServiceRepository::class)->findByUser(auth()->user()->id, []);
            $ccsSetup = app(ICCSSetupRepository::class)->findByUser(auth()->user()->id, []);

        } else {
            // Site manager
            throw new Exception('Not allowed for site manager', 1000);
        }

        $service_id = $service->service_id;
        $person_id = $ccsSetup->person_id;

        $queryObj = [
            '$ccsserviceid' => $service_id,
            '$expand' => 'SessionOfCares,SessionOfCares/Entitlements'
        ];

        if (!is_null($filters)) {

            if (isset($filters->start_date) && !empty($filters->start_date)) {
                $queryObj['$ccsreportstartdate'] = $filters->start_date;

                if (isset($filters->end_date) && !empty($filters->end_date)) {
                    $queryObj['$ccsreportenddate'] = $filters->end_date;
                }

            }

            if (isset($filters->enrolment_id) && !empty($filters->enrolment_id)) {
                $queryObj['$ccsenrolmentid'] = $filters->enrolment_id;
            }

        }

        try
        {
            $client = new Client();

            $url = Helpers::getConfig('session_subsidy', 'end_points');

            $api_result = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => config('ccs-provider.api_key'),
                    'authpersonid' => $person_id
                ],
                'query' => $queryObj
            ]);

            if ($api_result->getStatusCode() == 200) {

                $api_data_body = $api_result->getBody()->getContents();
                $api_response = json_decode($api_data_body, true);

                if ($format) {
                    $return_array = self::formatSubsidyData($api_response);
                } elseif ($csv) {
                    $return_array = self::formatSubsidyCsv($api_response);
                } else {
                    $return_array = $api_response;
                }

            } else {
                throw new Exception('API Error');
            }

            return $return_array;
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }
    }

    /**
     * format subsidy data
     * @param $api_response
     * @return null
     * @throws Exception
     */
    public static function formatSubsidyData($api_response)
    {

        $return_array = [];

        if (array_key_exists('results', $api_response) && is_array($api_response['results']) && count($api_response['results']) > 0) {

            $enrolment_ids = array_column($api_response['results'], 'enrolmentID');

            $enrolments = app(ICCSEnrolmentRepository::class)->with('child')->whereIn('enrolment_id', $enrolment_ids)->get();
            $enrolments_array = $enrolments->toArray();

            foreach ($api_response['results'] as $record) {

                $index = array_search($record['enrolmentID'], array_column($enrolments_array, 'enrolment_id'));

                if ($index === false) {
                    $record['child'] = null;
                } else {
                    $record['child'] = new ChildResource($enrolments[$index]['child'], ['basic' => true]);
                }

                array_push($return_array, $record);

            }
        }

        return $return_array;

    }

    /**
     * format subsidy data for csv
     * @param $api_response
     * @return null
     * @throws Exception
     */
    public static function formatSubsidyCsv($api_response)
    {

        $return_array = [];

        if (array_key_exists('results', $api_response) && is_array($api_response['results']) && count($api_response['results']) > 0) {

            $enrolment_ids = array_column($api_response['results'], 'enrolmentID');

            $enrolments = app(ICCSEnrolmentRepository::class)->with('child')->whereIn('enrolment_id', $enrolment_ids)->get();
            $enrolments_array = $enrolments->toArray();

            foreach ($api_response['results'] as $record) {

                $index = array_search($record['enrolmentID'], array_column($enrolments_array, 'enrolment_id'));

                if ($index === false) {
                    $record['child'] = null;
                } else {
                    $ind_child = $enrolments[$index]['child'];
                    $record['child'] = $ind_child ? $ind_child['first_name'] . ' ' . $ind_child['last_name'] : '';
                }

                if (array_key_exists('SessionOfCares', $record) && $record['SessionOfCares']) {

                    if (array_key_exists('results', $record['SessionOfCares']) && $record['SessionOfCares']['results']) {

                        foreach ($record['SessionOfCares']['results'] as $session_record) {

                            if (array_key_exists('Entitlements', $session_record) && $session_record['Entitlements']) {

                                if (array_key_exists('results', $session_record['Entitlements']) && $session_record['Entitlements']['results']) {

                                    foreach ($session_record['Entitlements']['results'] as $entitlemet_record) {

                                        $record['date'] = $session_record['date'];
                                        $record['endTime'] = $session_record['endTime'];
                                        $record['hourlyAmountCharged'] = $session_record['endTime'];
                                        $record['sessionAmountCharged'] = $session_record['sessionAmountCharged'];
                                        $record['startTime'] = $session_record['startTime'];
                                        $record['totalHoursInSession'] = $session_record['totalHoursInSession'];

                                        $record['amount'] = $entitlemet_record['amount'];
                                        $record['processedDateTime'] = $entitlemet_record['processedDateTime'];
                                        $record['reason'] = $entitlemet_record['reason'];
                                        $record['recipient'] = $entitlemet_record['recipient'];
                                        $record['subsidisedHours'] = $entitlemet_record['subsidisedHours'];
                                        $record['type'] = $entitlemet_record['type'];
                                        $record['eventID'] = $entitlemet_record['eventID'];

                                        $record['SessionOfCares'] = null;

                                        array_push($return_array, $record);

                                    }

                                }

                            }

                        }

                    }

                }

            }
        }

        return $return_array;

    }

    /**
     * @param $api_data
     * @param $local_data
     * @return bool
     */
    public static function compareSessionRoutine($local_data, $api_data)
    {
        $local_mapped_values = new Collection(array_map(function ($item) {
            return [
                'date' => $item['date'],
                'amount' => $item['amountCharged']
            ];
        }, $local_data));

        $api_mapped_values = new Collection(array_map(function ($item) {
            return [
                'date' => $item['date'],
                'amount' => $item['amountCharged']
            ];
        }, $api_data));

        // sort by date
        $local_mapped_values = array_values($local_mapped_values->sort()->toArray());
        $api_mapped_values = array_values($api_mapped_values->sort()->toArray());

        return empty(Helpers::array_diff_assoc_recursive($local_mapped_values, $api_mapped_values));
    }

    /**
     * get ccs entitlement
     * @param $filters
     * @param $format
     * @param false $csv
     * @return array|mixed
     * @throws Exception
     * @throws GuzzleException
     */
    public static function getEntitlementApiData($filters, $format, $csv = false)
    {

        $return_array = [];

        if (auth()->user()->isBranchUser()) {

            $service = app(IServiceRepository::class)->findByUser(auth()->user()->id, []);
            $ccsSetup = app(ICCSSetupRepository::class)->findByUser(auth()->user()->id, []);

        } else {
            // Site manager
            throw new Exception('Not allowed for site manager', ErrorType::CustomValidationErrorCode);
        }

        $service_id = $service->service_id;
        $person_id = $ccsSetup->person_id;

        $queryObj = [
            '$ccsserviceid' => $service_id
        ];

        if (!is_null($filters)) {

            if (isset($filters->dateOfEntitlement) && !empty($filters->dateOfEntitlement)) {

                $queryObj['$ccsdateofentitlement'] = $filters->dateOfEntitlement;

            }

            if (isset($filters->child) && !empty($filters->child) && $filters->child != 'ServiceID') {

                $child = app(IChildRepository::class)->findById(Helpers::decodeHashedID($filters->child), ['active_ccs_enrolment']);

                if (empty($child->active_ccs_enrolment)) {
                    throw new Exception('Active enrolment not found for this child', ErrorType::CustomValidationErrorCode);
                }

                $queryObj['$ccsenrolmentid'] = $child->active_ccs_enrolment->first()->enrolment_id;

            }

        }

        try
        {
            $client = new Client();

            $url = Helpers::getConfig('entitlement', AWSConfigType::API_GATEWAY);

            $api_result = $client->request('GET', $url, [
                'headers' => [
                    'x-api-key' => config('aws.gateway_api_key'),
                    'authpersonid' => $person_id
                ],
                'query' => $queryObj
            ]);

            if ($api_result->getStatusCode() == 200) {

                $api_data_body = $api_result->getBody()->getContents();
                $api_response = json_decode($api_data_body, true);

                if ($format) {

                    $return_array = self::formatEntitlementAPIData($api_response);

                } else {
                    $return_array = $api_response;
                }

            } else {
                throw new Exception('API Error', ErrorType::CustomValidationErrorCode);
            }

            $return_array = $return_array['results'] ?? [];

            if (!is_null($filters)) {

                if (isset($filters->annual_cap) && !empty($filters->annual_cap) && $filters->annual_cap != 'all') {

                    $return_array = array_filter($return_array, function($val) use($filters) {

                        if ($filters->annual_cap == 'yes') {
                            return $val['annualCapReached'] == 'true';
                        } else {
                            return $val['annualCapReached'] == 'false';
                        }

                    });

                }

                if (isset($filters->absence_count) && !empty($filters->absence_count) && $filters->absence_count != 'all') {

                    $return_array = array_filter($return_array, function($val) use($filters) {
                        $count = (int)$val['absenceCount'] ?? 0;

                        if ($filters->absence_count == 'yes') {
                            return $count >= 42;
                        } else {
                            return $count < 42;
                        }

                    });

                }

                if (isset($filters->ccs_percentage) && !empty($filters->ccs_percentage) && $filters->ccs_percentage != 'all') {

                    $return_array = array_filter($return_array, function($val) use($filters) {
                        $percentage = (int)$val['CCSPercentage'] ?? 0;

                        if ($filters->ccs_percentage == 'yes') {
                            return $percentage > 0;
                        } else {
                            return $percentage == 0;
                        }

                    });

                }

                if (isset($filters->accs_percentage) && !empty($filters->accs_percentage) && $filters->accs_percentage != 'all') {

                    $return_array = array_filter($return_array, function($val) use($filters) {
                        $percentage = (int)$val['ACCSHourlyRateCapIncreasePercentage'] ?? 0;

                        if ($filters->accs_percentage == 'yes') {
                            return $percentage > 0;
                        } else {
                            return $percentage == 0;
                        }

                    });

                }


            }

            return array_values($return_array);
        }
        catch(ServerException $e)
        {
            throw new Exception($e->getMessage(), ErrorType::CustomValidationErrorCode);
        }

    }

    /**
     * get format ccs entitlement
     * @param $api_data
     * @return array[]|mixed
     */
    public static function formatEntitlementAPIData($api_data)
    {

        $data = empty($api_data) ? ['results' => []] : $api_data;

        if (array_key_exists('results', $data) && count($data['results']) > 0) {

            $en_ids = array_filter(array_column($data['results'], 'enrolmentID'), function($value) {
                return !empty($value);
            });

            $enrolments = app(ICCSEnrolmentRepository::class)->query()->whereIn('enrolment_id', $en_ids)->with(['child'])->get()->toArray();

            $enrolment_ids = array_column($enrolments, 'enrolment_id');

            foreach ($data['results'] as $key => $item) {

                $data['results'][$key]['childName'] = '';

                if (array_key_exists('enrolmentID', $item) && !empty($item['enrolmentID'])) {

                    $en_index = array_search($item['enrolmentID'], $enrolment_ids);

                    if ($en_index !== false && !empty($enrolments[$en_index]['child'])) {

                        $data['results'][$key]['childName'] = $enrolments[$en_index]['child']['first_name'] . ' ' .  $enrolments[$en_index]['child']['last_name'];

                    }

                }

            }

        }

        return $data;

    }

    /*-----------------------------------------------------------*/

    /**
     * get acceptable status for session submission
     * @param bool $isNoCare
     * @return array
     */
    public static function getValidEnrolmentStatusForSubmission(bool $isNoCare = false)
    {
        return $isNoCare ? [
            array_keys(CCSType::CCS_STATUS_MAP)[2],
            array_keys(CCSType::CCS_STATUS_MAP)[6],
            array_keys(CCSType::CCS_STATUS_MAP)[7],
            array_keys(CCSType::CCS_STATUS_MAP)[8]
        ] : [
            array_keys(CCSType::CCS_STATUS_MAP)[1],
            array_keys(CCSType::CCS_STATUS_MAP)[2],
            array_keys(CCSType::CCS_STATUS_MAP)[6],
            array_keys(CCSType::CCS_STATUS_MAP)[7],
            array_keys(CCSType::CCS_STATUS_MAP)[8]
        ];
    }
}
