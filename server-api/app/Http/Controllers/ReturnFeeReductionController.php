<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use ErrorHandler;
use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\ReturnFeeReduction;
use Kinderm8\Child;
use Kinderm8\Branch;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Http\Resources\ReturnFeeReductionResource;
use Kinderm8\Http\Resources\ReturnFeeReductionResourceCollection;
use LocalizationHelper;
use RequestHelper;
use Aws\Sns\SnsClient;
use CCSHelpers;
use Carbon\Carbon;
use Log;
use DB;
use Kinderm8\Enums\AWSConfigType;

class ReturnFeeReductionController extends Controller
{
    /**
     * get Return Fee Reduction list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        try
        {
            $child_id = Helpers::decodeHashedID($request->input('child_id'));

            //pagination
            // $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            $returnFeeObj = ReturnFeeReduction::where('child_id', '=', $child_id)->orderBy('created_at', 'desc');

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //search
            if (!is_null($searchValue)) {

               $returnFeeObj->whereLike(['returnFeeReductionID'], $searchValue);
            }

            $apiArray = array();

            $returnFeeSyncedObj = $returnFeeObj->where('is_synced', '=', '1')->get();

            foreach ($returnFeeSyncedObj as $value) {

                $auth_person_id = '0110460024';

                $client = new Client();

                $url = Helpers::getConfig('read_return_fee',AWSConfigType::API_GATEWAY).'?$ccserviceid='.$value->properties['serviceID'].'&$enrolmentid='.$value->properties['enrolmentID'].'&$ccsreturnfeereductionid='.$value->returnFeeReductionID;

                $res = $client->request('GET', $url, [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => auth()->user()->ccs_id,
                    ]
                ]);

                $body = $res->getBody()->getContents();

                $resp_data = json_decode($body, true);

                if (isset($resp_data['results'][0])) {

                    array_push($apiArray, $resp_data['results'][0]);
                }
            }

            $returnFeeObj2 = ReturnFeeReduction::withTrashed()->where('child_id', '=', $child_id)->orderBy('created_at', 'desc');

            //search
            if (!is_null($searchValue)) {

                $returnFeeObj2->whereLike(['returnFeeReductionID'], $searchValue);
            }

            $returnFeeNotSyncedObj = $returnFeeObj2->get();

            //check if any enrolment (curent) is active
            // $ccs_api_response = CCSHelpers::getChildEnrolment([
            //     'ccschildcrn' => $child->ccs_id,
            //     'ccsstatus' => 'CONFIR'
            // ]);

            return (new ReturnFeeReductionResourceCollection($returnFeeNotSyncedObj))
                ->additional([
                    'ApiData' => $apiArray,
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, ($e->getCode() === ErrorHandler::CUSTOM_ERROR_CODE) ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    public function create(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'enrolmentID' => ['required'],
                'sessionReportStartDate' => ['required'],
                'totalFeeReductionAmountForWeek' => ['required'],
                'amountPassedOnToIndividual' => ['required'],
                'amountNotPassedOnToIndividual' => ['required'],
                'returnFeeReductionReason' => ['required'],

            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $API_properties =  [
                'serviceID' => auth()->user()->branch->providerService->service_id,
                'enrolmentID' => $request->input('enrolmentID'),
                'sessionReportStartDate' => $request->input('sessionReportStartDate'),
                'totalFeeReductionAmountForWeek' => $request->input('totalFeeReductionAmountForWeek'),
                'amountPassedOnToIndividual' => $request->input('amountPassedOnToIndividual'),
                'amountNotPassedOnToIndividual' => $request->input('amountNotPassedOnToIndividual'),
                'returnFeeReductionReason' => $request->input('returnFeeReductionReason'),
            ];

            $child_id = Helpers::decodeHashedID($request->input('childId'));

            $returnFee = new ReturnFeeReduction();
            $returnFee->organization_id = auth()->user()->organization_id;
            $returnFee->branch_id =  auth()->user()->branch_id;
            $returnFee->child_id = $child_id;
            $returnFee->properties =  $API_properties;
            $returnFee->created_by =  auth()->user()->id;

            $returnFee->save();

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $returnFee->organization_id,
                'branch' => $returnFee->branch_id,
                "subjectid" => $returnFee->id,
                "authpersonid" => auth()->user()->ccs_id,
                "action" => "New Return Fee Reduction"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('return_fee', AWSConfigType::SNS),
                'Subject' => 'New Return Fee Reduction (SNS)'
            ]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
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

    public function update(Request $request)
    {

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'enrolmentID' => ['required'],
                'sessionReportStartDate' => ['required'],
                'totalFeeReductionAmountForWeek' => ['required'],
                'amountPassedOnToIndividual' => ['required'],
                'amountNotPassedOnToIndividual' => ['required'],
                'returnFeeReductionReason' => ['required'],

            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $API_properties =  [
                'serviceID' => auth()->user()->branch->providerService->service_id,
                'enrolmentID' => $request->input('enrolmentID'),
                'sessionReportStartDate' => $request->input('sessionReportStartDate'),
                'totalFeeReductionAmountForWeek' => $request->input('totalFeeReductionAmountForWeek'),
                'amountPassedOnToIndividual' => $request->input('amountPassedOnToIndividual'),
                'amountNotPassedOnToIndividual' => $request->input('amountNotPassedOnToIndividual'),
                'returnFeeReductionReason' => $request->input('returnFeeReductionReason'),
            ];

            $returnFee = ReturnFeeReduction::find(Helpers::decodeHashedID($request->input('id')));
            $returnFee->properties =  $API_properties;
            $returnFee->created_by =  auth()->user()->id;
            $returnFee->is_synced = '0';
            $returnFee->syncerror = null;

            $returnFee->save();

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $returnFee->organization_id,
                'branch' => $returnFee->branch_id,
                "subjectid" => $returnFee->id,
                "authpersonid" => auth()->user()->ccs_id,
                "action" => "Update Return Fee Reduction"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('return_fee', AWSConfigType::SNS),
                'Subject' => 'Update Return Fee Reduction (SNS)'
            ]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
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

    public function delete(Request$request){

        DB::beginTransaction();

        try {

            $validator = Validator::make($request->all(), [
                'returnFeeReductionID' => ['required'],
                'cancelReturnFeeReductionReason' => ['required'],
            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }
            $ts =  Carbon::now()->toDateTimeString();
            $returnFee = ReturnFeeReduction::where('returnFeeReductionID', $request->input('returnFeeReductionID'))->get()->first();
            $returnFee->cancelReturnFeeReductionReason =  $request->input('cancelReturnFeeReductionReason');
            $returnFee->created_by =  auth()->user()->id;
            $returnFee->deleted_at =  $ts;
            $returnFee->is_synced = '0';

            $returnFee->save();

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $returnFee->organization_id,
                'branch' => $returnFee->branch_id,
                "subjectid" => $returnFee->id,
                "authpersonid" => auth()->user()->ccs_id,
                "action" => "Cancel Return Fee Reduction"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('cancle_return_fee', AWSConfigType::SNS),
                'Subject' => 'Cancel Return Fee Reduction (SNS)'
            ]);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
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
