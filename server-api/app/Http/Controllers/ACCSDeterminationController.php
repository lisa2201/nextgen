<?php

namespace Kinderm8\Http\Controllers;

use ACCSHelpers;
use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use CCSHelpers;
use Kinderm8\ACCS;
use Kinderm8\Branch;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use DB;
use Exception;
use Helpers;
use Kinderm8\Child;
use Illuminate\Http\Request;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use LocalizationHelper;
use RequestHelper;
use Log;

class ACCSDeterminationController extends Controller
{

    private $ccsSetupRepo;

    public function __construct(ICCSSetupRepository $ccsSetupRepo)
    {
        $this->ccsSetupRepo = $ccsSetupRepo;
    }


    public function getDeterminationByID(Request $request) {

        try {

            $determinationID = $request->input('id');
            $center = Helpers::decodeHashedID($request->get('branch'));
            $branch = Branch::findOrFail($center);
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            $ccsOrg = $this->ccsSetupRepo->findByBranch(Helpers::decodeHashedID($request->get('branch')), []);
    
            $resp_data_determinaion = ACCSHelpers::getDeterminationByID($providerID, $determinationID, $serviceID, $ccsOrg->person_id);
    
            // make the risk reasons into a readable array for front end
    
            foreach($resp_data_determinaion['results'] as $key=>$result) {
                
                $RRDisplayDetermination = array();
                
                if(array_key_exists('RiskReasons', $result)) {
                    
                    foreach($result['RiskReasons']['results'] as $risk_reason)
                    {
                        array_push($RRDisplayDetermination,$risk_reason['reason']);
                    }

                }

                $resp_data_determinaion['results'][$key]['riskReasons'] = $RRDisplayDetermination;
    
                /* when the state territory data form is filled but not submitted to the CCS, make sure the filled state territory data is appended to api data.*/
                if(array_key_exists('determinationID', $result))
                    $tempAccsDeter = ACCS::where('certificate_or_determination_id',$result['determinationID'])->get()->first();
    
                if($tempAccsDeter) {
                    if(!empty($tempAccsDeter->state_territory_data) && $tempAccsDeter->state_territory_data != '')
                    {
                        if(array_key_exists('StateTerritory', $tempAccsDeter['state_territory_data']))
                            $resp_data_determinaion['results'][$key]['StateTerritory'] = $tempAccsDeter['state_territory_data']['StateTerritory'];
                    }
    
                    if(empty($resp_data_determinaion['results'][$key]['SupportingDocuments']['results']))
                    {
                        if(array_key_exists('certificateID', $result) && array_key_exists('SupportingDocuments',$tempAccsDeter['certificate_or_determination_api_data']))
                            $resp_data_determinaion['results'][$key]['SupportingDocuments'] = $tempAccsDeter['certificate_or_determination_api_data']['SupportingDocuments'];
                    }
                }
    
            }

            $data = array_key_exists('results', $resp_data_determinaion) && count($resp_data_determinaion['results']) > 0 ? $resp_data_determinaion['results'][0] : null;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_201
            );

        } catch (Exception $e) {

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        
        }

    }

    public function newDetermination(Request $request) {

        DB::beginTransaction();

        try {

            // $child = $request->get('child');
            $determination_start_date = $request->get('determination_start_date');
            $center = $request->get('center');
            $weeksAtRisk = $request->get('weeksAtRisk');
            $riskReasons = $request->get('riskReasons');
            $risk_to_date = $request->get('risk_to_date');
            $additional_info = $request->get('additional_info');
            $reason_no_third_party = $request->get('reason_no_third_party');
            $byToStateTerritory = $request->get('byToStateTerritory');
            $dateNoticeGiven = $request->get('dateNoticeGiven');
            $stateTerritorySwitch = $request->get('stateTerritorySwitch');
            $bodyType = $request->get('bodyType');
            $orgName = $request->get('orgName');
            $refNo = $request->get('refNo');
            $statePersonNameOrID = $request->get('statePersonNameOrID');
            $statePersonContact = $request->get('statePersonContact');
            $statePersonEmail = $request->get('statePersonEmail');
            $notifiedByPersonFirstName = $request->get('notifiedByPersonFirstName');
            $notifiedByPersonLastName = $request->get('notifiedByPersonLastName');
            $supportingDocInput = $request->get('supportingDocInput');
            $certificateID = $request->get('certificateLink');
            $exceptionalReasonText = $request->input('exceptionalReasonText');
            $exceptionalReason = $request->input('exceptionalReason');
            $extensionReasons = !empty($request->input('extensionReasons')) ? $request->input('extensionReasons') : [];
    
            $RRsend = array();
            foreach($riskReasons as $riskReason){
                array_push($RRsend, ['reason' => $riskReason]);
            }

            $extension_reasons_array = array_map(function($value) {
                return [
                    'extensionReason' => $value
                ];
            }, $extensionReasons);
    
            $child_id = Helpers::decodeHashedID($request->input('child'));
            $child = Child::with('active_ccs_enrolment')->findOrFail($child_id);
            $center = Helpers::decodeHashedID($request->input('center'));
            $branch = Branch::findOrFail($center);
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            //check if any enrolment (curent) is active
            if (count($child->active_ccs_enrolment) == 0) {
                throw new Exception('No confirmed enrolment exists for this child', ErrorType::CustomValidationErrorCode);
            }
    
            $supportingDocuments = $supportingDocInput;
    
            $determination_api_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'childFirstName' => $child->first_name,
                'childLastName' => $child->last_name,
                'childCRN' => $child->ccs_id,
                'childDateOfBirth' => $child->dob,
                'determinationStartDate' => $determination_start_date,
                'weeksAtRisk' => (int)$weeksAtRisk,
                'indicativeRiskToDate' => $risk_to_date,
                //            'evidenceProvided' => "Y", removed?
                'RiskReasons' => $RRsend,
                // center id
                'centerID' => $center
            ];

            if (!Helpers::IsNullOrEmpty($exceptionalReason)) {
                $determination_api_data['exceptionalCircumstanceReason'] = $exceptionalReason;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReasonText)) {
                $determination_api_data['exceptionalCircumstanceText'] = $exceptionalReasonText;
            }

            if (count($extension_reasons_array) > 0) {
                $determination_api_data['ExtensionReasons'] = $extension_reasons_array;
            }

            if($certificateID)
                $determination_api_data['certificateID'] = $certificateID;
            if($supportingDocuments)
                $determination_api_data['SupportingDocuments'] = $supportingDocuments;
            if($additional_info)
                $determination_api_data['additionalInfo'] = $additional_info;
            if($reason_no_third_party)
                $determination_api_data['reasonNo3rdParty'] = $reason_no_third_party;

    
            if($byToStateTerritory == 'byState_Territory')
            {
                $isNotifiedByStateTerritory = true;
                $isNoticeToStateTerritory = false;
            }
            else{
                $isNotifiedByStateTerritory = false;
                $isNoticeToStateTerritory = true;
            }
            // WILL be filled when first creating certificate
            $state_territory_data_for_determination_api_column = [
                'isNotifiedByStateTerritory' => $isNotifiedByStateTerritory,
                'isNoticeToStateTerritory' => $isNoticeToStateTerritory,
                'dateNoticeGiven' => $dateNoticeGiven,
                'bodyType' => $bodyType,
                'organisationName' => $orgName,
                'statePersonNameOrID' => $statePersonNameOrID,
                'statePersonContact' => $statePersonContact,
                'statePersonEmail' => $statePersonEmail,
                'stateReferenceNumber' => $refNo,
            ];
            if($state_territory_data_for_determination_api_column['dateNoticeGiven'])
            {
                $determination_api_data['StateTerritory'] = $state_territory_data_for_determination_api_column;
            }
    
            $state_territory_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'StateTerritory' => [
                    'isNotifiedByStateTerritory' => $isNotifiedByStateTerritory,
                    'isNoticeToStateTerritory' => $isNoticeToStateTerritory,
                    'dateNoticeGiven' => $dateNoticeGiven,
                    'notifiedByPersonLastName' => $notifiedByPersonLastName,
                    'notifiedByPersonFirstName' => $notifiedByPersonFirstName,
                    'bodyType' => $bodyType,
                    'organisationName' => $orgName,
                    'statePersonNameOrID' => $statePersonNameOrID,
                    'statePersonContact' => $statePersonContact,
                    'statePersonEmail' => $statePersonEmail,
                    'stateReferenceNumber' => $refNo,
                ]
            ];
    
            $newACCSDetermination = new ACCS();
            $newACCSDetermination->child_profile_id = $child->id;
            $newACCSDetermination->organization_id = $branch->organization_id;
            $newACCSDetermination->branch_id = $branch->id;
            $newACCSDetermination->type = 'Determination';
            $newACCSDetermination->draft = (empty($request->input('draft')))? false: true;
            $newACCSDetermination->certificate_or_determination_api_data = $determination_api_data;
            $newACCSDetermination->state_territory_data = $state_territory_data;
            $newACCSDetermination->save();

            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);

            /* =========================== SNS ========================================*/
            if(empty($request->input('draft')))
            {
                $sns = new SnsClient([
                    'region' => 'ap-southeast-2',
                    'version' => "2010-03-31",
                    'credentials' => new Credentials(
                        config('aws.access_key'),
                        config('aws.secret_key')
                    )
                ]);

                $message = json_encode([
                    "organization" => $branch->organization_id,
                    'branch' => $branch->id,
                    "subjectid" => $newACCSDetermination->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "New ACCS Determination"
                ]);

                $result = $sns->publish([
                    'Message' => $message,
                    'TopicArn' => Helpers::getConfig('new_determination', AWSConfigType::SNS),
                    'Subject' => 'New ACCS Determination (SNS)'
                ]);
            }

            DB::commit();
    
    
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_201
            );

        } catch (Exception $e) {

            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }
        
    }

    public function updateDetermination(Request $request) {

        DB::beginTransaction();

        try {

            // $child = $request->get('child');
            $determination_start_date = $request->get('determination_start_date');
            $center = $request->get('center');
            $weeksAtRisk = $request->get('weeksAtRisk');
            $riskReasons = $request->get('riskReasons');
            $risk_to_date = $request->get('risk_to_date');
            $additional_info = $request->get('additional_info');
            $reason_no_third_party = $request->get('reason_no_third_party');
            $byToStateTerritory = $request->get('byToStateTerritory');
            $dateNoticeGiven = $request->get('dateNoticeGiven');
            $stateTerritorySwitch = $request->get('stateTerritorySwitch');
            $bodyType = $request->get('bodyType');
            $orgName = $request->get('orgName');
            $refNo = $request->get('refNo');
            $statePersonNameOrID = $request->get('statePersonNameOrID');
            $statePersonContact = $request->get('statePersonContact');
            $statePersonEmail = $request->get('statePersonEmail');
            $notifiedByPersonFirstName = $request->get('notifiedByPersonFirstName');
            $notifiedByPersonLastName = $request->get('notifiedByPersonLastName');
            $supportingDocInput = $request->get('supportingDocInput');
            $certificateID = $request->get('certificateLink');
            $exceptionalReasonText = $request->input('exceptionalReasonText');
            $exceptionalReason = $request->input('exceptionalReason');
            $extensionReasons = !empty($request->input('extensionReasons')) ? $request->input('extensionReasons') : [];
    
            $RRsend = array();
            foreach($riskReasons as $riskReason){
                array_push($RRsend, ['reason' => $riskReason]);
            }

            $extension_reasons_array = array_map(function($value) {
                return [
                    'extensionReason' => $value
                ];
            }, $extensionReasons);
    
            $child_id = Helpers::decodeHashedID($request->input('child'));
            $child = Child::with('active_ccs_enrolment')->findOrFail($child_id);
            $center = Helpers::decodeHashedID($request->input('center'));
            $currentDeterminationId = $request->input('id');
            $currentDetermination = ACCS::where('id',$currentDeterminationId)->get()->first();
            
            //check if any enrolment (curent) is active
            if (count($child->active_ccs_enrolment) == 0) {
                throw new Exception('No confirmed enrolment exists for this child', ErrorType::CustomValidationErrorCode);
            }
    
            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            $supportingDocuments = $supportingDocInput;
    
            $determination_api_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
    
                'childFirstName' => $child->first_name,
                'childLastName' => $child->last_name,
                'childCRN' => $child->ccs_id,
                'childDateOfBirth' => $child->dob,
                'determinationStartDate' => $determination_start_date,
                'weeksAtRisk' => $weeksAtRisk,
                'indicativeRiskToDate' => $risk_to_date,
                //            'evidenceProvided' => "Y", removed?
                'RiskReasons' => $RRsend,
            ];
    
            if($certificateID)
                $determination_api_data['certificateID'] = $certificateID;
            if($supportingDocuments)
                $determination_api_data['SupportingDocuments'] = $supportingDocuments;
            if($additional_info)
                $determination_api_data['additionalInfo'] = $additional_info;
            if($reason_no_third_party)
                $determination_api_data['reasonNo3rdParty'] = $reason_no_third_party;
    
            if($byToStateTerritory == 'byState_Territory')
            {
                $isNotifiedByStateTerritory = true;
                $isNoticeToStateTerritory = false;
            }
            else{
                $isNotifiedByStateTerritory = false;
                $isNoticeToStateTerritory = true;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReason)) {
                $determination_api_data['exceptionalCircumstanceReason'] = $exceptionalReason;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReasonText)) {
                $determination_api_data['exceptionalCircumstanceText'] = $exceptionalReasonText;
            }

            if (count($extension_reasons_array) > 0) {
                $determination_api_data['ExtensionReasons'] = $extension_reasons_array;
            }
    
            // WILL be filled when first creating certificate
            $state_territory_data_for_determination_api_column = [
                'isNotifiedByStateTerritory' => $isNotifiedByStateTerritory,
                'isNoticeToStateTerritory' => $isNoticeToStateTerritory,
                'dateNoticeGiven' => $dateNoticeGiven,
                'bodyType' => $bodyType,
                'organisationName' => $orgName,
                'statePersonNameOrID' => $statePersonNameOrID,
                'statePersonContact' => $statePersonContact,
                'statePersonEmail' => $statePersonEmail,
                'stateReferenceNumber' => $refNo,
            ];

            if($state_territory_data_for_determination_api_column['dateNoticeGiven'])
            {
                $determination_api_data['StateTerritory'] = $state_territory_data_for_determination_api_column;
            }
    
            $state_territory_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'StateTerritory' => [
                    'isNotifiedByStateTerritory' => $isNotifiedByStateTerritory,
                    'isNoticeToStateTerritory' => $isNoticeToStateTerritory,
                    'dateNoticeGiven' => $dateNoticeGiven,
                    'notifiedByPersonLastName' => $notifiedByPersonLastName,
                    'notifiedByPersonFirstName' => $notifiedByPersonFirstName,
                    'bodyType' => $bodyType,
                    'organisationName' => $orgName,
                    'statePersonNameOrID' => $statePersonNameOrID,
                    'statePersonContact' => $statePersonContact,
                    'statePersonEmail' => $statePersonEmail,
                    'stateReferenceNumber' => $refNo,
                ]
            ];

            $currentDetermination->child_profile_id = $child->id;
            $currentDetermination->type = 'Determination';
            $currentDetermination->draft = false;
            $currentDetermination->certificate_or_determination_api_data = $determination_api_data;
            $currentDetermination->state_territory_data = $state_territory_data;
            $currentDetermination->save();

            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);

            /* =========================== SNS ========================================*/
            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $message = json_encode([
                "organization" => $branch->organization_id,
                'branch' => $branch->id,
                "subjectid" => $currentDetermination->id,
                "authpersonid" => $ccsOrg->person_id,
                "action" => "New ACCS Determination"
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('new_determination', AWSConfigType::SNS),
                'Subject' => 'New ACCS Determination (SNS)'
            ]);

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
            
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        
        }

    }

}
