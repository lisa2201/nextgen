<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\HealthAndMedical;
use Kinderm8\Http\Resources\HealthAndMedicalResource;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use RequestHelper;
use Log;
use PathHelper;
use DB;

class HealthAndMedicalController extends Controller
{


    private $snsService;

    public function __construct(SNSContract $snsService)
    {
        $this->snsService = $snsService;
    }


    /**
     * get booking request list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {

        try {
            $child_id = Helpers::decodeHashedID($request->input('child_id'));

            $medicalData = HealthAndMedical::where('child_id', '=', $child_id)->get()->first();

            return (new HealthAndMedicalResource($medicalData))
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

    public function update(Request $request)
    {
        DB::beginTransaction();
        try {
            if($request->input('id') != ''){
            $medicalInfo =   HealthAndMedical::find(Helpers::decodeHashedID($request->input('id')));
            $action = 'update';
            }
            else{
                $medicalInfo =  new HealthAndMedical();
                $medicalInfo->child_id = Helpers::decodeHashedID($request->input('childId'));
                $action = 'create';

            }
            $medicalInfo->ref_no = $request->input('ref_no');
            $medicalInfo->medicare_expiry_date = $request->input('medicare_expiry_date');
            $medicalInfo->ambulance_cover_no = $request->input('ambulance_cover_no');
            $medicalInfo->health_center = $request->input('health_center');
            $medicalInfo->service_name = $request->input('service_name');
            $medicalInfo->service_phone_no = $request->input('service_phone_no');
            $medicalInfo->service_address = $request->input('service_address');

            $medicalInfo->save();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => (auth()->user()->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' =>  $medicalInfo->child_id,
                        'action' => ($action == 'create') ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_UPDATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
                \Log::info($medicalInfo->child_id);
            }

            DB::commit();


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {
            DB::rollBack();

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

    public function delete(Request $request)
    {
    }
}
