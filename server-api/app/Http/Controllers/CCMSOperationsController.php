<?php

namespace Kinderm8\Http\Controllers;


use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use CCMSHelper;
use CCSHelpers;
use Illuminate\Support\Facades\Crypt;
use Kinderm8\ACCS;
use Kinderm8\Branch;
use Kinderm8\ChildNoLongerAtRisk;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Http\Controllers\Controller;
use Carbon\Carbon;
use DateTimeHelper;
use DB;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Kinderm8\Child;
use Kinderm8\ChildEmergencyContact as ChildEmergencyContact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Allergy;
use Kinderm8\BookingRequest;

use Kinderm8\Http\Resources\ACCSResourceCollection;
use Kinderm8\ServiceSetup;
use LocalizationHelper;
use RequestHelper;
use function JmesPath\search;

class CCMSOperationsController extends Controller
{
    /**
     * Handle the incoming request.
     *
     * @param \Illuminate\Http\Request $request
     * @return array|\Illuminate\Http\JsonResponse
     */

    public function queryRemittance(Request $request){
        // return $request;
        /*$filters = $request->input('filters');
        if($filters == 'undefined')
        {
            return ['ApiData' => null];
        }*/
        $ClearingNumber = 'SFJG798709';
        $DatePaidFrom = '2020-03-01';
        $DatePaidTo = '2020-04-01';
        $PaymentLineItemId = '232323';

        $offset = $request->input('offset');
        $page = $request->input('page');

        $filters = $request->input('filters');
        $filters = json_decode($filters, true);

        $ClearingNumber = $filters['clearingNumber'];
        $PaymentLineItemId = $filters['paymentLineItem'];
        $DatePaidFrom = $filters['startDate'];
        $DatePaidTo = $filters['endDate'];

        $branch = Helpers::decodeHashedID($request->get('branch'));
        $branch = Branch::where('id',$branch)->get()->first();

        $service = ServiceSetup::where('organization_id', auth()->user()->organization_id)->where('service_id', $branch->providerService->service_id)->get()->first();
        $SourceSystemCode =  config('dss.source_system_code');
        $transactionID = CCMSHelper::ccmsTransactionID($request);
        if($ClearingNumber && $PaymentLineItemId && $DatePaidFrom && $DatePaidTo)
        {
            \Log::info('ALL parameters provided');
            $url = Helpers::getConfig('query_remittance',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
        }
        elseif(!$ClearingNumber && !$PaymentLineItemId && $DatePaidFrom && $DatePaidTo)
        {
            \Log::info('DatePaidFrom and DatePayedTo only');
            $url = Helpers::getConfig('query_remittance',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo;
        }
        elseif(!$ClearingNumber && $PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('PaymentLineItemID only');
            $url = Helpers::getConfig('query_remittance',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&PaymentLineItemId='.$PaymentLineItemId;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&PaymentLineItemId='.$PaymentLineItemId;
        }
        elseif($ClearingNumber && !$PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('ClearingNumber only');
            $url = Helpers::getConfig('query_remittance',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber;
        }
        elseif(!$ClearingNumber && !$PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('No Paramters');
            $url = Helpers::getConfig('query_remittance',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$service->service_id.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID;
        }
        else
        {
            \Log::info("ClearingNo =>".$ClearingNumber);
            \Log::info("PaymentLineItemId =>".$PaymentLineItemId);
            \Log::info("DatePaidFrom =>".$DatePaidFrom);
            \Log::info("DatePayedTo =>".$DatePaidTo);
            return ['ApiData' => null ];
        }



        /* final one */
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;

//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=1&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=2&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=2&TransactionId=QM280420201&ClearingNumber=SFJG798709&DatePaidFrom=2020-03-01&DatePaidTo=2020-04-01&PaymentLineItemId=232323';
        $client = new \GuzzleHttp\Client();


        $username = $password = null;
        if($service->credentials)
        {

            if(array_key_exists('username',$service->credentials))
            {
                $username = $service->credentials['username'];
            }
            if(array_key_exists('password',$service->credentials))
            {
                $password = Crypt::decryptString($service->credentials['password']);
            }
            if(!$username || !$password)
            {
                \Log::info('Username or password missing, for Service====>');
                \Log::info($service);
                return ['ApiData' => ['ReturnMessage' => 'Please setup CCMS authentication details in CCMS connection section', 'ReturnError' => 'API Error']];
            }
        }
        else
        {
            \Log::info('Service Credentials Missing, for Service =====>');
            \Log::info($service);
            return ['ApiData' => ['ReturnMessage' => 'Please setup CCMS authentication details in CCMS connection section', 'ReturnError' => 'API Error']];
        }
        \Log::info("username ===> ".$username. " password====> ".$password);
        try {
            $response = $client->get($url, [
                'auth' => [
                    $username,
                    $password
                ]
            ]);
        }
        catch (\Exception $e){
            \Log::error($e);
            if($e->getResponse())
            {
                $errorResponse = (string) $e->getResponse()->getBody();
                if($errorResponse)
                {
                    $errorResponseJSON = json_decode($errorResponse, true);
                    if($errorResponseJSON['Category'] && $errorResponseJSON['FaultText'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['FaultText'], 'ReturnError' => 'API Error']];
                    if($errorResponseJSON['Category'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['Category'], 'ReturnError' => 'API Error']];
                }
            }
            return ['ApiData' => ['ReturnMessage' => 'Error Connecting to API', 'ReturnError' => 'API Error']];
        }

        $body = $response->getBody()->getContents();
        $api_data = json_decode($body,true);
        \Log::info('----------CCMS Response------------');
        \Log::info($api_data);

        /*$sampleData = '{
                        "TransactionId": "QM280420201",
                        "ReturnCode": "0",
                        "ReturnError": "null",
                        "ReturnMessage": "OK",
                        "LastPage": "true",
                        "ListOfPayments": {
                            "Payment" : [{
                                "PaymentLineItemId": "1-HJUI",
                                "ClearingNumber": "18531697",
                                "PayeeId": "1-GHY8Y",
                                "ApprovalId": "1-677ZP",
                                "DatePaid": "2006-09-21",
                                "FinancialYear": "2005-2006",
                                "InvoiceNumber": "14831681",
                                "OrganisationInvoiceNumber": "1-1QS3X",
                                "PaymentType": "Approval Payment",
                                "RemittanceDescription": "1-HJUI ",
                                "ProcessingDate": "2006-05-30",
                                "GSTExclusiveAmount": "55.55",
                                "GSTInclusiveAmount": "61.11",
                                "GSTCode": "Tax Free (0%)",
                                "PaymentOrRefund": "Payment",
                                "OffsetIndicator": "Y",
                                "CaseId": "1-453DF",
                                "CaseClaimId": "1-234FE"
                                },
                                {
                                "PaymentLineItemId": "1-HJUK",
                                "ClearingNumber": "18531697",
                                "PayeeId": "1-GHY8Y",
                                "ApprovalId": "1-677ZP",
                                "DatePaid": "2006-09-21",
                                "FinancialYear": "2005-2006",
                                "InvoiceNumber": "14831681",
                                "OrganisationInvoiceNumber": "1-1QS3X",
                                "PaymentType": "Approval Payment",
                                "RemittanceDescription": "1-HJUI ",
                                "ProcessingDate": "2006-05-30",
                                "GSTExclusiveAmount": "55.55",
                                "GSTInclusiveAmount": "61.11",
                                "GSTCode": "Tax Free (0%)",
                                "PaymentOrRefund": "Payment",
                                "OffsetIndicator": "Y",
                                "CaseId": "1-453DF",
                                "CaseClaimId": "1-234FE"
                                }]
                        }

                        }';
        $sampleData = json_decode($sampleData,true);*/

       // return ['ApiData' => $sampleData ];
        return ['ApiData' => $api_data ];

    }


    public function queryPayments(Request $request){
        $offset = $request->input('offset');
        $page = $request->input('page');


        $filters = $request->input('filters');
        $filters = json_decode($filters, true);

        $ClearingNumber = $filters['clearingNumber'];
        $PaymentLineItemId = $filters['paymentLineItem'];
        $DatePaidFrom = $filters['startDate'];
        $DatePaidTo = $filters['endDate'];
        $serviceID = $filters['service'];
        $service = ServiceSetup::where('service_id',$serviceID)->get()->first();

        $SourceSystemCode =  config('dss.source_system_code');
        $transactionID = CCMSHelper::ccmsTransactionID($request);

        if($ClearingNumber && $PaymentLineItemId && $DatePaidFrom && $DatePaidTo)
        {
            \Log::info('ALL parameters provided');
            $url = Helpers::getConfig('querypayments',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
        }
        elseif(!$ClearingNumber && !$PaymentLineItemId && $DatePaidFrom && $DatePaidTo)
        {
            \Log::info('DatePaidFrom and DatePayedTo only');
            $url = Helpers::getConfig('querypayments',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo;
        }
        elseif(!$ClearingNumber && $PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('PaymentLineItemID only');
            $url = Helpers::getConfig('querypayments',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&PaymentLineItemId='.$PaymentLineItemId;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&PaymentLineItemId='.$PaymentLineItemId;
        }
        elseif($ClearingNumber && !$PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('ClearingNumber only');
            $url = Helpers::getConfig('querypayments',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments?SourceSystemCode='.$SourceSystemCode .'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID.'&ClearingNumber='.$ClearingNumber;
        }
        elseif(!$ClearingNumber && !$PaymentLineItemId && !$DatePaidFrom && !$DatePaidTo)
        {
            \Log::info('No Paramters');
            $url = Helpers::getConfig('querypayments',AWSConfigType::API_GATEWAY).'?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID;
                // 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/querypayments?SourceSystemCode='.$SourceSystemCode.'&ApprovalId='.$serviceID.'&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId='.$transactionID;
        }
        else
        {
            \Log::info("ClearingNo =>".$ClearingNumber);
            \Log::info("PaymentLineItemId =>".$PaymentLineItemId);
            \Log::info("DatePaidFrom =>".$DatePaidFrom);
            \Log::info("DatePayedTo =>".$DatePaidTo);
            return ['ApiData' => null ];
        }


        /* final one */
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize='.$offset.'&PageNumber='.$page.'&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;

//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=1&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=2&TransactionId=QM280420201&ClearingNumber='.$ClearingNumber.'&DatePaidFrom='.$DatePaidFrom.'&DatePaidTo='.$DatePaidTo.'&PaymentLineItemId='.$PaymentLineItemId;
//        $url = 'https://nst35-gws.dss.gov.au/childcare/ccms/remittance/json/QueryRemittance?SourceSystemCode=KINDv2.069hbk&ApprovalId=190012455K&PageSize=10&PageNumber=2&TransactionId=QM280420201&ClearingNumber=SFJG798709&DatePaidFrom=2020-03-01&DatePaidTo=2020-04-01&PaymentLineItemId=232323';
        $client = new \GuzzleHttp\Client();



        $username = $password = null;
        if($service->credentials)
        {

            if(array_key_exists('username',$service->credentials))
            {
                $username = $service->credentials['username'];
            }
            if(array_key_exists('password',$service->credentials))
            {
                $password = Crypt::decryptString($service->credentials['password']);
            }
            if(!$username || !$password)
            {
                \Log::info('Username or password missing, for Service====>');
                \Log::info($service);
                return ['ApiData' => ['ReturnMessage' => 'Please setup CCMS authentication details in CCMS connection section', 'ReturnError' => 'API Error']];
            }
        }
        else
        {
            \Log::info('Username or password missing, for Service====>');
            \Log::info($service);
            return ['ApiData' => ['ReturnMessage' => 'Please setup CCMS authentication details in CCMS connection section', 'ReturnError' => 'API Error']];
        }

        \Log::info("username ===> ".$username. " password====> ".$password);
        try {
            $response = $client->get($url, [
                'auth' => [
                    $username,
                    $password
                ]
            ]);
        }
        catch (\Exception $e){
            \Log::error($e);
            if($e->getResponse())
            {
                $errorResponse = (string) $e->getResponse()->getBody();
                if($errorResponse)
                {
                    $errorResponseJSON = json_decode($errorResponse, true);
                    if($errorResponseJSON['Category'] && $errorResponseJSON['FaultText'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['FaultText'], 'ReturnError' => 'API Error']];
                    if($errorResponseJSON['Category'])
                        return ['ApiData' => ['ReturnMessage' => $errorResponseJSON['Category'], 'ReturnError' => 'API Error']];
                }
            }
            return ['ReturnMessage' => 'Error Connecting to API', 'ReturnError' => 'API Error'];
        }

        $body = $response->getBody()->getContents();
        $api_data = json_decode($body,true);

        \Log::info('----------CCMS Response------------');
        \Log::info($api_data);

        // return ['ApiData' => $sampleData ];
        return ['ApiData' => $api_data ];
    }
}
