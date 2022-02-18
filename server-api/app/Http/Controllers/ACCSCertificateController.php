<?php

namespace Kinderm8\Http\Controllers;

use ACCSHelpers;
use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use CCSHelpers;
use Kinderm8\ACCS;
use Kinderm8\Branch;
use Kinderm8\ChildNoLongerAtRisk;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Kinderm8\Child;
use Illuminate\Http\Request;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\ACCSResourceCollection;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;
use LocalizationHelper;
use Log;
use RequestHelper;

class ACCSCertificateController extends Controller
{

    private $ccsSetupRepo;
    private $providerRepo;

    public function __construct(ICCSSetupRepository $ccsSetupRepo, IProviderRepository $providerRepo)
    {
        $this->ccsSetupRepo = $ccsSetupRepo;
        $this->providerRepo = $providerRepo;
    }

    public function get(Request $request) {

        try {

            $child_id = Helpers::decodeHashedID($request->input('index'));
            $child = Child::where('id', $child_id)->get()->first();

            $accs_data = ACCS::where('child_profile_id', $child_id)->get();

            $center = Helpers::decodeHashedID($request->input('branch'));
            $branch = Branch::where('id',$center)->get()->first();

            $childCRN = $child->ccs_id;
            $childDOB = $child->dob;

            $apiArray = array();

            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);
            $provider = $this->providerRepo->findByBranch($branch->id, []);

            $resp_data_certificate = ACCSHelpers::getCertificatesByChild($provider->provider_id, $childCRN, $childDOB, $ccsOrg->person_id);

            // make the risk reasons into a readable array for front end

            foreach($resp_data_certificate['results'] as $key=>$result) {

                $RRDisplayCertificate = array();

                if(array_key_exists('RiskReasons', $result)) {

                    foreach($result['RiskReasons']['results'] as $risk_reason)
                    {
                        array_push($RRDisplayCertificate,$risk_reason['reason']);
                    }

                }

                $resp_data_certificate['results'][$key]['riskReasons'] = $RRDisplayCertificate;

                /*if the certificate from the API exists in the db, exclude it from the db array*/
                if(array_key_exists('certificateID', $result))
                {
                    foreach($accs_data as $keyx=>$record)
                    {
                        if($record->certificate_or_determination_id == $result['certificateID'])
                            unset($accs_data[$keyx]);
                    }

                }

                /* when the state territory data form is filled but not submitted to the CCS, make sure the filled state territory data is appended to api data.*/
                if(array_key_exists('certificateID', $result)) {
                    // Log::info('Get certificate for branch '. $branch->id);                    
                    $tempAccsCert = ACCS::where('branch_id', '=', $branch->id)->where('certificate_or_determination_id',$result['certificateID'])->get()->first();
                    // Log::info($tempAccsCert);
                }

                if($tempAccsCert)
                {
                    if(!empty($tempAccsCert->state_territory_data) && $tempAccsCert->state_territory_data != '')
                    {
                        if(array_key_exists('StateTerritory', $tempAccsCert['state_territory_data']))
                            $resp_data_certificate['results'][$key]['StateTerritory'] = $tempAccsCert['state_territory_data']['StateTerritory'];
                    }


                    if(empty($resp_data_certificate['results'][$key]['SupportingDocuments']['results']))
                    {
                        if(array_key_exists('certificateID', $result) && array_key_exists('SupportingDocuments',$tempAccsCert['certificate_or_determination_api_data']))
                            $resp_data_certificate['results'][$key]['SupportingDocuments'] = $tempAccsCert['certificate_or_determination_api_data']['SupportingDocuments'];
                    }

                    /* if child no longer at risk is submitted, attach it*/
                    if($tempAccsCert->getChildNoLongerAtRisk)
                    {
                        $resp_data_certificate['results'][$key]['childNoLonerAtRisk'] = true;
                        $resp_data_certificate['results'][$key]['child_no_longer_at_risk_data']  = $tempAccsCert->getChildNoLongerAtRisk;
                    }

                    /* append the cancellation reason if available */
                    if($tempAccsCert->cancel_reason)
                    {
                        $resp_data_certificate['results'][$key]['cancel_reason'] = $tempAccsCert->cancel_reason;
                    }

                }

            }

            $resp_data_determination = ACCSHelpers::getDeterminationByChild($provider->provider_id, $childCRN, $childDOB, $ccsOrg->person_id);

            // make the risk reasons into a readable array for front end

            foreach($resp_data_determination['results'] as $keyD=>$result) {

                $RRDisplayDetermination = array();

                if(array_key_exists('RiskReasons', $result)) {

                    foreach($result['RiskReasons']['results'] as $risk_reason)
                    {
                        array_push($RRDisplayDetermination,$risk_reason['reason']);
                    }
                    
                }

                $extension_reasons = !empty($result['ExtensionReasons']) && !empty($result['ExtensionReasons']['results']) ? array_map(function($value) {
                    return $value['extensionReason'];
                }, $result['ExtensionReasons']['results']) : [];

                $resp_data_determination['results'][$keyD]['riskReasons'] = $RRDisplayDetermination;
                $resp_data_determination['results'][$keyD]['extensionReasons'] = $extension_reasons;

                /*if the determination from the API exists in the db, exclude it from the db array*/
                if(array_key_exists('determinationID', $result))
                {

                    foreach($accs_data as $keyY=>$record)
                    {
                        if($record->certificate_or_determination_id == $result['determinationID'])
                            unset($accs_data[$keyY]);
                    }

                }

                /* when the state territory data form is filled but not submitted to the CCS, make sure the filled state territory data is appended to api data.*/
                if(array_key_exists('determinationID', $result)) {
                    $tempAccsDeter = ACCS::where('branch_id', '=', $branch->id)->where('certificate_or_determination_id',$result['determinationID'])->get()->first();
                }

                if($tempAccsDeter)
                {
                    if(!empty($tempAccsDeter->state_territory_data)  && $tempAccsDeter->state_territory_data != '')
                    {
                        if(array_key_exists('StateTerritory', $tempAccsDeter['state_territory_data']))
                            $resp_data_determination['results'][$keyD]['StateTerritory'] = $tempAccsDeter['state_territory_data']['StateTerritory'];
                    }


                    if(empty($resp_data_determination['results'][$keyD]['SupportingDocuments']['results']))
                    {
                        if(array_key_exists('certificateID', $result) && array_key_exists('SupportingDocuments',$tempAccsDeter['certificate_or_determination_api_data']))
                            $resp_data_determination['results'][$keyD]['SupportingDocuments'] = $tempAccsDeter['certificate_or_determination_api_data']['SupportingDocuments'];
                    }

                    /* if child no longer at risk is submitted, attach it*/
                    if($tempAccsDeter->getChildNoLongerAtRisk)
                    {
                        $resp_data_determination['results'][$keyD]['childNoLonerAtRisk'] = true;
                        $resp_data_determination['results'][$keyD]['child_no_longer_at_risk_data']  = $tempAccsDeter->getChildNoLongerAtRisk;
                    }

                    /* append the cancellation reason if available */
                    if($tempAccsDeter->cancel_reason)
                    {
                        $resp_data_determination['results'][$keyD]['cancel_reason'] = $tempAccsDeter->cancel_reason;
                    }
                }
            }

            $apiArray = array_merge($resp_data_certificate['results'], $resp_data_determination['results']);

            return (new ACCSResourceCollection($accs_data))
                ->additional([
                    'ApiData' => $apiArray,
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);


        } catch (Exception $e) {

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        
        }

        
    }

    public function getCertificateByID(Request $request) {

        try {

            $certificateID = $request->input('id');
            $center = Helpers::decodeHashedID($request->get('branch'));
            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);
    
            $resp_data_certificate = ACCSHelpers::getCertificateByID($providerID, $certificateID, $serviceID, $ccsOrg->person_id);
    
            // make the risk reasons into a readable array for front end

            foreach($resp_data_certificate['results'] as $key=>$result) {

                $RRDisplayCertificate = array();
                if(array_key_exists('RiskReasons', $result)) {

                    foreach($result['RiskReasons']['results'] as $risk_reason)
                    {
                        array_push($RRDisplayCertificate,$risk_reason['reason']);
                    }

                }
                
                $resp_data_certificate['results'][$key]['riskReasons'] = $RRDisplayCertificate;
    
                /* when the state territory data form is filled but not submitted to the CCS, make sure the filled state territory data is appended to api data.*/
                if(array_key_exists('certificateID', $result))
                    $tempAccsCert = ACCS::where('certificate_or_determination_id',$result['certificateID'])->get()->first();
    
                if($tempAccsCert) {
                    if(!empty($tempAccsCert->state_territory_data) && $tempAccsCert->state_territory_data != '')
                    {
                        if(array_key_exists('StateTerritory', $tempAccsCert['state_territory_data']))
                            $resp_data_certificate['results'][$key]['StateTerritory'] = $tempAccsCert['state_territory_data']['StateTerritory'];
                    }
    
                    if(empty($resp_data_certificate['results'][$key]['SupportingDocuments']['results']))
                    {
                        if(array_key_exists('certificateID', $result) && array_key_exists('SupportingDocuments',$tempAccsCert['certificate_or_determination_api_data']))
                            $resp_data_certificate['results'][$key]['SupportingDocuments'] = $tempAccsCert['certificate_or_determination_api_data']['SupportingDocuments'];
                    }
                }
    
            }

            $data = array_key_exists('results', $resp_data_certificate) && count($resp_data_certificate['results']) > 0 ? $resp_data_certificate['results'][0] : null;

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

    public function newCertificate(Request $request) {

        DB::beginTransaction();

        try {

            $certificate_start_date = $request->get('certificate_start_date');
            $weeksAtRisk = $request->get('weeksAtRisk');
            $evidenceHeld = $request->get('evidenceHeld');
            $riskReasons = $request->get('riskReasons');
            $cancellation_reason = $request->get('cancellation_reason');
            $stateTerritorySwitch = $request->get('stateTerritorySwitch');
            $byToStateTerritory = $request->get('byToStateTerritory');
            $dateNoticeGiven = $request->get('dateNoticeGiven');
            $bodyType = $request->get('bodyType');
            $orgName = $request->get('orgName');
            $refNo = $request->get('refNo');
            $statePersonNameOrID = $request->get('statePersonNameOrID');
            $statePersonContact = $request->get('statePersonContact');
            $statePersonEmail = $request->get('statePersonEmail');
            $notifiedByPersonFirstName = $request->get('notifiedByPersonFirstName');
            $notifiedByPersonLastName = $request->get('notifiedByPersonLastName');
            $supportingDocInput = $request->get('supportingDocInput');
            $exceptionalReasonText = $request->input('exceptionalReasonText');
            $exceptionalReason = $request->input('exceptionalReason');
    
    
            $RRsend = array();
            foreach($riskReasons as $riskReason){
                array_push($RRsend, ['reason' => $riskReason]);
            }

            $child = Helpers::decodeHashedID($request->input('child'));
            $child = Child::with('active_ccs_enrolment')->findOrFail($child);
            $center = Helpers::decodeHashedID($request->input('center'));

            $branch = Branch::findOrFail($center);
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            //check if any enrolment (curent) is active
            if (count($child->active_ccs_enrolment) == 0) {
                throw new Exception('No confirmed enrolment exists for this child', ErrorType::CustomValidationErrorCode);
            }
    
            $supportingDocs = $supportingDocInput;
            $certificate_api_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'childFirstName' => $child->first_name,
                'childLastName' => $child->last_name,
                'childCRN' => $child->ccs_id,
                'childDateOfBirth' => $child->dob,
                'certificateStartDate' => $certificate_start_date,
                'weeksAtRisk' => (int)$weeksAtRisk,
                'isEvidenceHeld' => $evidenceHeld == true ? true : false,
                'RiskReasons' => $RRsend,
                'centerID' => $center
            ];

            if (!Helpers::IsNullOrEmpty($exceptionalReason)) {
                $certificate_api_data['exceptionalCircumstanceReason'] = $exceptionalReason;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReasonText)) {
                $certificate_api_data['exceptionalCircumstanceText'] = $exceptionalReasonText;
            }
    
            if(!empty($supportingDocs))
            $certificate_api_data['SupportingDocuments'] =  $supportingDocs;
    
    
            if($byToStateTerritory == 'byState_Territory')
            {
                $isNotifiedByStateTerritory = true;
                $isNoticeToStateTerritory = false;
            }
            else{
                $isNotifiedByStateTerritory = false;
                $isNoticeToStateTerritory = true;
            }
            // will not be filled when first creating certificate
            $state_territory_data = [
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
                    'stateReferenceNumber' => $refNo
            ];

            $newACCSCertificate = new ACCS();
            $newACCSCertificate->child_profile_id = $child->id;
            $newACCSCertificate->organization_id = $branch->organization_id;
            $newACCSCertificate->branch_id = $branch->id;
            $newACCSCertificate->type = 'Certificate';
            $newACCSCertificate->draft = (empty($request->input('draft')))? false: true;
            $newACCSCertificate->certificate_or_determination_api_data = $certificate_api_data;
            $newACCSCertificate->state_territory_data = [];
            $newACCSCertificate->save();

            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);

            /* =========================== SNS ========================================*/
            // Submit the SNS if only certificate is not submitted as a draft
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
                    "subjectid" => $newACCSCertificate->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "New ACCS Certificate"
                ]);

                $result = $sns->publish([
                    'Message' => $message,
                    'TopicArn' => Helpers::getConfig('new_certificate', AWSConfigType::SNS),
                    'Subject' => 'New ACCS Certificate (SNS)'
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

    public function updateCertificate(Request $request) {

        DB::beginTransaction();

        try {

            $certificate_start_date = $request->get('certificate_start_date');
            $weeksAtRisk = $request->get('weeksAtRisk');
            $evidenceHeld = $request->get('evidenceHeld');
            $riskReasons = $request->get('riskReasons');
            $cancellation_reason = $request->get('cancellation_reason');
            $stateTerritorySwitch = $request->get('stateTerritorySwitch');
            $byToStateTerritory = $request->get('byToStateTerritory');
            $dateNoticeGiven = $request->get('dateNoticeGiven');
            $bodyType = $request->get('bodyType');
            $orgName = $request->get('orgName');
            $refNo = $request->get('refNo');
            $statePersonNameOrID = $request->get('statePersonNameOrID');
            $statePersonContact = $request->get('statePersonContact');
            $statePersonEmail = $request->get('statePersonEmail');
            $notifiedByPersonFirstName = $request->get('notifiedByPersonFirstName');
            $notifiedByPersonLastName = $request->get('notifiedByPersonLastName');
            $supportingDocInput = $request->get('supportingDocInput');
            $exceptionalReasonText = $request->input('exceptionalReasonText');
            $exceptionalReason = $request->input('exceptionalReason');
    
            $RRsend = array();
            foreach($riskReasons as $riskReason){
                array_push($RRsend, ['reason' => $riskReason]);
            }
    
            $child_id = Helpers::decodeHashedID($request->input('child'));
            $child = Child::with('active_ccs_enrolment')->findOrFail($child_id);
            $center = Helpers::decodeHashedID($request->input('center'));
            $currentCertificateId = $request->input('id');
            $currentCertificate = ACCS::where('id',$currentCertificateId)->get()->first();
    
            //check if any enrolment (curent) is active
            if (count($child->active_ccs_enrolment) == 0) {
                throw new Exception('No confirmed enrolment exists for this child', ErrorType::CustomValidationErrorCode);
            }
    
            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            $supportingDocs = $supportingDocInput;
    
            $certificate_api_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'childFirstName' => $child->first_name,
                'childLastName' => $child->last_name,
                'childCRN' => $child->ccs_id,
                'childDateOfBirth' => $child->dob,
                'certificateStartDate' => $certificate_start_date,
                'weeksAtRisk' => $weeksAtRisk,
                'isEvidenceHeld' => $evidenceHeld == true ? true : false,
                'RiskReasons' => $RRsend,
            ];
    
            if(!empty($supportingDocs))
                $certificate_api_data['SupportingDocuments'] =  $supportingDocs;
    
            if($byToStateTerritory == 'byState_Territory')
            {
                $isNotifiedByStateTerritory = true;
                $isNoticeToStateTerritory = false;
            }
            else {
                $isNotifiedByStateTerritory = false;
                $isNoticeToStateTerritory = true;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReason)) {
                $certificate_api_data['exceptionalCircumstanceReason'] = $exceptionalReason;
            }

            if (!Helpers::IsNullOrEmpty($exceptionalReasonText)) {
                $certificate_api_data['exceptionalCircumstanceText'] = $exceptionalReasonText;
            }
    
            // will not be filled when first creating certificate
            $state_territory_data = [
                'isNotifiedByStateTerritory' => $isNotifiedByStateTerritory,
                'isNoticeToStateTerritory' => $isNoticeToStateTerritory,
                'dateNoticeGiven' => $dateNoticeGiven,
                'notifiedByPersonLastName' => $notifiedByPersonLastName,
                'notifiedByPersonFirstName' => $notifiedByPersonFirstName,
                'bodyType' => $bodyType,
                // dummy data for supporting document 204k
                'SupportingDocument204K' => [
                    'documentType' => "ACC003",
                    'fileName' => "State/Territory notice (204K notice)",
                    'mimeType' => "pdf",
                    'fileContent' => "JVBERi0xLjMNCiXi48/TDQoNCjEgMCBvYmoNCjw8DQovVHlwZSAvQ2F0YWxvZw0KL091dGxpbmVzIDIgMCBSDQovUGFnZXMgMyAwIFINCj4+DQplbmRvYmoNCg0KMiAwIG9iag0KPDwNCi9UeXBlIC9PdXRsaW5lcw0KL0NvdW50IDANCj4+DQplbmRvYmoNCg0KMyAwIG9iag0KPDwNCi9UeXBlIC9QYWdlcw0KL0NvdW50IDINCi9LaWRzIFsgNCAwIFIgNiAwIFIgXSANCj4+DQplbmRvYmoNCg0KNCAwIG9iag0KPDwNCi9UeXBlIC9QYWdlDQovUGFyZW50IDMgMCBSDQovUmVzb3VyY2VzIDw8DQovRm9udCA8PA0KL0YxIDkgMCBSIA0KPj4NCi9Qcm9jU2V0IDggMCBSDQo+Pg0KL01lZGlhQm94IFswIDAgNjEyLjAwMDAgNzkyLjAwMDBdDQovQ29udGVudHMgNSAwIFINCj4+DQplbmRvYmoNCg0KNSAwIG9iag0KPDwgL0xlbmd0aCAxMDc0ID4+DQpzdHJlYW0NCjIgSg0KQlQNCjAgMCAwIHJnDQovRjEgMDAyNyBUZg0KNTcuMzc1MCA3MjIuMjgwMCBUZA0KKCBBIFNpbXBsZSBQREYgRmlsZSApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY4OC42MDgwIFRkDQooIFRoaXMgaXMgYSBzbWFsbCBkZW1vbnN0cmF0aW9uIC5wZGYgZmlsZSAtICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjY0LjcwNDAgVGQNCigganVzdCBmb3IgdXNlIGluIHRoZSBWaXJ0dWFsIE1lY2hhbmljcyB0dXRvcmlhbHMuIE1vcmUgdGV4dC4gQW5kIG1vcmUgKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NTIuNzUyMCBUZA0KKCB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDYyOC44NDgwIFRkDQooIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjE2Ljg5NjAgVGQNCiggdGV4dC4gQW5kIG1vcmUgdGV4dC4gQm9yaW5nLCB6enp6ei4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNjA0Ljk0NDAgVGQNCiggbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDU5Mi45OTIwIFRkDQooIEFuZCBtb3JlIHRleHQuIEFuZCBtb3JlIHRleHQuICkgVGoNCkVUDQpCVA0KL0YxIDAwMTAgVGYNCjY5LjI1MDAgNTY5LjA4ODAgVGQNCiggQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA1NTcuMTM2MCBUZA0KKCB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBFdmVuIG1vcmUuIENvbnRpbnVlZCBvbiBwYWdlIDIgLi4uKSBUag0KRVQNCmVuZHN0cmVhbQ0KZW5kb2JqDQoNCjYgMCBvYmoNCjw8DQovVHlwZSAvUGFnZQ0KL1BhcmVudCAzIDAgUg0KL1Jlc291cmNlcyA8PA0KL0ZvbnQgPDwNCi9GMSA5IDAgUiANCj4+DQovUHJvY1NldCA4IDAgUg0KPj4NCi9NZWRpYUJveCBbMCAwIDYxMi4wMDAwIDc5Mi4wMDAwXQ0KL0NvbnRlbnRzIDcgMCBSDQo+Pg0KZW5kb2JqDQoNCjcgMCBvYmoNCjw8IC9MZW5ndGggNjc2ID4+DQpzdHJlYW0NCjIgSg0KQlQNCjAgMCAwIHJnDQovRjEgMDAyNyBUZg0KNTcuMzc1MCA3MjIuMjgwMCBUZA0KKCBTaW1wbGUgUERGIEZpbGUgMiApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY4OC42MDgwIFRkDQooIC4uLmNvbnRpbnVlZCBmcm9tIHBhZ2UgMS4gWWV0IG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NzYuNjU2MCBUZA0KKCBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSB0ZXh0LiBBbmQgbW9yZSApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY2NC43MDQwIFRkDQooIHRleHQuIE9oLCBob3cgYm9yaW5nIHR5cGluZyB0aGlzIHN0dWZmLiBCdXQgbm90IGFzIGJvcmluZyBhcyB3YXRjaGluZyApIFRqDQpFVA0KQlQNCi9GMSAwMDEwIFRmDQo2OS4yNTAwIDY1Mi43NTIwIFRkDQooIHBhaW50IGRyeS4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gQW5kIG1vcmUgdGV4dC4gKSBUag0KRVQNCkJUDQovRjEgMDAxMCBUZg0KNjkuMjUwMCA2NDAuODAwMCBUZA0KKCBCb3JpbmcuICBNb3JlLCBhIGxpdHRsZSBtb3JlIHRleHQuIFRoZSBlbmQsIGFuZCBqdXN0IGFzIHdlbGwuICkgVGoNCkVUDQplbmRzdHJlYW0NCmVuZG9iag0KDQo4IDAgb2JqDQpbL1BERiAvVGV4dF0NCmVuZG9iag0KDQo5IDAgb2JqDQo8PA0KL1R5cGUgL0ZvbnQNCi9TdWJ0eXBlIC9UeXBlMQ0KL05hbWUgL0YxDQovQmFzZUZvbnQgL0hlbHZldGljYQ0KL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcNCj4+DQplbmRvYmoNCg0KMTAgMCBvYmoNCjw8DQovQ3JlYXRvciAoUmF2ZSBcKGh0dHA6Ly93d3cubmV2cm9uYS5jb20vcmF2ZVwpKQ0KL1Byb2R1Y2VyIChOZXZyb25hIERlc2lnbnMpDQovQ3JlYXRpb25EYXRlIChEOjIwMDYwMzAxMDcyODI2KQ0KPj4NCmVuZG9iag0KDQp4cmVmDQowIDExDQowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDAwMTkgMDAwMDAgbg0KMDAwMDAwMDA5MyAwMDAwMCBuDQowMDAwMDAwMTQ3IDAwMDAwIG4NCjAwMDAwMDAyMjIgMDAwMDAgbg0KMDAwMDAwMDM5MCAwMDAwMCBuDQowMDAwMDAxNTIyIDAwMDAwIG4NCjAwMDAwMDE2OTAgMDAwMDAgbg0KMDAwMDAwMjQyMyAwMDAwMCBuDQowMDAwMDAyNDU2IDAwMDAwIG4NCjAwMDAwMDI1NzQgMDAwMDAgbg0KDQp0cmFpbGVyDQo8PA0KL1NpemUgMTENCi9Sb290IDEgMCBSDQovSW5mbyAxMCAwIFINCj4+DQoNCnN0YXJ0eHJlZg0KMjcxNA0KJSVFT0YNCg=="
                ],
                // dummy data for supporting document 204k end
                'organisationName' => $orgName,
                'statePersonNameOrID' => $statePersonNameOrID,
                'statePersonContact' => $statePersonContact,
                'statePersonEmail' => $statePersonEmail,
                'stateReferenceNumber' => $refNo
            ];
    
            $currentCertificate->child_profile_id = $child->id;
            $currentCertificate->type = 'Certificate';
            $currentCertificate->certificate_or_determination_api_data = $certificate_api_data;
            $currentCertificate->draft = false;
            // $currentCertificate->state_territory_data = $state_territory_data;
            $currentCertificate->save();
    
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
                "subjectid" => $currentCertificate->id,
                "authpersonid" => $ccsOrg->person_id,
                "action" => "New ACCS Certificate"
            ]);
    
            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('new_certificate', AWSConfigType::SNS),
                'Subject' => 'New ACCS Certificate (SNS)'
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

    public function updateStateTerritory(Request $request) {

        DB::beginTransaction();

        try {

            // $stateTerritorySwitch = $request->get('stateTerritorySwitch');
            $byToStateTerritory = $request->get('byToStateTerritory');
            $dateNoticeGiven = $request->get('dateNoticeGiven');
            $bodyType = $request->get('bodyType');
            $orgName = $request->get('orgName');
            $refNo = $request->get('refNo');
            $statePersonNameOrID = $request->get('statePersonNameOrID');
            $statePersonContact = $request->get('statePersonContact');
            $statePersonEmail = $request->get('statePersonEmail');
            $notifiedByPersonFirstName = $request->get('notifiedByPersonFirstName');
            $notifiedByPersonLastName = $request->get('notifiedByPersonLastName');
            $center = Helpers::decodeHashedID($request->get('center'));
            $supportingDocInput = $request->get('supportingDocInput');
    
            $certificateOrDeterminationAPIId = $request->input('certificateAPIID');
    
            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;
    
            if($byToStateTerritory == 'byState_Territory')
            {
                $isNotifiedByStateTerritory = true;
                $isNoticeToStateTerritory = false;
            }
            else{
                $isNotifiedByStateTerritory = false;
                $isNoticeToStateTerritory = true;
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
    
            if(!empty($supportingDocInput))
            {
                $state_territory_data['SupportingDocument204k'] = $supportingDocInput[0];
            }
    
            // $currentCertificate->type = 'Certificate';
            $certificateOrDeterminationAPIId = $request->get('certificateAPIID');
            $currentCertificateorDetermination = ACCS::where('certificate_or_determination_id',$certificateOrDeterminationAPIId)->get()->first();
            if($currentCertificateorDetermination)
            {
                //subject id for sns
                $subjectID = $currentCertificateorDetermination->id;
                // certificate or determination currently exists in db! update the state/territory data only.
                $currentCertificateorDetermination->state_territory_data = $state_territory_data;
                $currentCertificateorDetermination->save();
            }
            else
            {
                // certificate or determination is not in db! insert a new record with api data.
    
                $certificate_or_determination_api_data = $request->get('apiData');
                $certificate_or_determination_api_data['RiskReasons'] = $certificate_or_determination_api_data['RiskReasons']['results'];
    
                $child = Helpers::decodeHashedID($request->get('child'));
    
                $child = Child::where('id',$child)->get()->first();
                $branch = Branch::where('id',$center)->get()->first();
                $typestring = (array_key_exists('certificateID',$certificate_or_determination_api_data)) ? 'Certificate' : 'Determination';
    
                $newACCSRecord = new ACCS();
                $newACCSRecord->certificate_or_determination_id = $certificateOrDeterminationAPIId;
                $newACCSRecord->child_profile_id = $child->id;
                $newACCSRecord->organization_id = $branch->organization_id;
                $newACCSRecord->branch_id = $branch->id;
                $newACCSRecord->type = $typestring;
                $newACCSRecord->is_synced = 1;
                $newACCSRecord->certificate_or_determination_api_data = $certificate_or_determination_api_data;
                $newACCSRecord->state_territory_data = $state_territory_data;
                $newACCSRecord->save();
                $subjectID = $newACCSRecord->id;
    
            }
    

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
                "subjectid" => $subjectID,
                "authpersonid" => $ccsOrg->person_id,
                "action" => "ACCS Update State/Territory Body"
            ]);
    
            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('update_state_territory', AWSConfigType::SNS),
                'Subject' => 'ACCS Update State/Territory Body (SNS)'
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

    public function updateDocuments(Request $request) {

        DB::beginTransaction();

        try {

            $certificateID = $request->input('certificateID');
            $supportingDocs = $request->input('supportingDocInput');
            $center = Helpers::decodeHashedID($request->get('center'));
            $branch = Branch::where('id',$center)->get()->first();

            $ACCS = ACCS::where('certificate_or_determination_id', $certificateID)->get()->first();

            if($ACCS)
            {
                $api_data = $ACCS->certificate_or_determination_api_data;
                Log::info('API DATA BEFORE DOCUMENT UPDATE');
                Log::info($api_data);

                foreach($supportingDocs as $key=>$supportingDoc)
                {
                    $supportingDocs[$key]['ID'] = $certificateID;
                }
                $uniqueID = uniqid();
                $supportingDocs[0]['uniqueID'] = $uniqueID;
                /*$api_data['SupportingDocuments'] = $supportingDocs;
                return $api_data['SupportingDocuments'];*/

                /* check if the document is already in the api data column. if yes, replace it.*/
                $documentFound = false;
                foreach($api_data['SupportingDocuments'] as $key=> $apiSupDoc)
                {
                    Log::info($apiSupDoc);
                    if($apiSupDoc['documentType'] == $supportingDocs[0]['documentType'])
                    {
                        $api_data['SupportingDocuments'][$key] = $supportingDocs[0];
                        $documentFound = true;
                    }
                }
                /* if the document is not in the api data column. append it. */
                if(!$documentFound){
                    array_push($api_data['SupportingDocuments'],$supportingDocs[0]);
                }

                $ACCS->certificate_or_determination_api_data = $api_data;
                $ACCS->save();

                Log::info('API DATA AFTER DOCUMENT UPDATE');
                Log::info($api_data);

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
                    "subjectid" => $ACCS->id,
                    "uniqueID" => $uniqueID,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "ACCS Certificate Update Document"
                ]);

                $result = $sns->publish([
                    'Message' => $message,
                    'TopicArn' => Helpers::getConfig('update_certificate_documents', AWSConfigType::SNS),
                    'Subject' => 'ACCS Certificate Update Document (SNS)'
                ]);
               
            }
            else{
                
                Log::info('ACCS Record for the certificate ID not found');
                throw new Exception('ACCS Record for the certificate ID not found', ErrorType::CustomValidationErrorCode);

            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {

            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        
        }

    }

    public function updateStateTerritoryDocument(Request $request) {

        DB::beginTransaction();

        try {

            $certificateID = $request->input('certificateID');
            $supportingDocs = $request->input('supportingDocInput');
            $center = Helpers::decodeHashedID($request->get('center'));
            $branch = Branch::where('id',$center)->get()->first();
        
            $ACCS = ACCS::where('certificate_or_determination_id', $certificateID)->get()->first();
    
            if($ACCS)
            {
                $state_territory_data = $ACCS->state_territory_data;
                Log::info('STATE TERRITORY DATA BEFORE DOCUMENT UPDATE');
                Log::info($state_territory_data);
    
                foreach($supportingDocs as $key=>$supportingDoc)
                {
                    $supportingDocs[$key]['ID'] = $certificateID;
                }
    
    
                /* check if the accs record has a filled State Territory column. if yes, replace the document.*/
                if($state_territory_data['StateTerritory']){
                   $state_territory_data['StateTerritory']['SupportingDocument204K'] = $supportingDocs[0];
                }
                /* if the state territory column is not filled. it shouldn't be able to update the document. must fill the column first. return error*/
                else{
                    Log::info('State Territory data not submitted yet. First Submit the State Territory data then update the document');
                    throw new Exception('State Territory data not submitted yet. First Submit the State Territory data then update the document', ErrorType::CustomValidationErrorCode);
                }
    
                $ACCS->state_territory_data = $state_territory_data;
                $ACCS->save();
    
                Log::info('API DATA AFTER DOCUMENT UPDATE');
                Log::info($state_territory_data);
    
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
                    "subjectid" => $ACCS->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "ACCS Certificate Update Territory Document"
                ]);
    
                $result = $sns->publish([
                    'Message' => $message,
                    'TopicArn' => Helpers::getConfig('update_certificate_state_territory_documents', AWSConfigType::SNS),
                    'Subject' => 'ACCS Certificate Update Territory Document (SNS)'
                ]);
    
            }
            else{
                Log::info('ACCS Record for the certificate ID not found');
                throw new Exception('ACCS Record for the certificate ID not found', ErrorType::CustomValidationErrorCode);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
        
    }

    public function adviceChildNoLongerAtRisk(Request $request){

        DB::beginTransaction();

        try {
        
            $child = Helpers::decodeHashedID($request->input('child'));
            $child = Child::where('id',$child)->get()->first();
            $center = Helpers::decodeHashedID($request->input('center'));

            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
            $serviceID = $service->service_id;
            $providerID = $service->provider->provider_id;

            $date_no_longer_at_risk = $request->get('date_no_longer_at_risk');
            $certificateOrDeterminationId = $request->get('id');
            $supportingDocInput = $request->get('supportingDocInput');
            $recordToSupportNoLongerAtRisk = ($request->get('record_to_support_no_longer_at_risk')) ? true : false;
            $noLongerAtRiskReason = $request->get('no_longer_at_risk_reason');


            $currentCertificateorDetermination = ACCS::where('certificate_or_determination_id',$certificateOrDeterminationId )->get()->first();

            if (!$currentCertificateorDetermination) {
                throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
            }

            $currentCertificateorDeterminationId = $currentCertificateorDetermination->id;

            $api_data = [
                'providerID' => $providerID,
                'serviceID' => $serviceID,
                'isDeclarationGiven' => true,
                'childCRN' => $child->ccs_id,
                'childDateOfBirth' => $child->dob,
                'dateNoLongerAtRisk' => $date_no_longer_at_risk,
                'recordToSupportNoLongerAtRisk' => $recordToSupportNoLongerAtRisk,
                'noLongerAtRiskReason' => $noLongerAtRiskReason
            ];
            if($currentCertificateorDetermination->type=='Certificate')
            {
                $api_data['certificateID'] = $certificateOrDeterminationId;
            }
            else
            {
                $api_data['determinationID'] = $certificateOrDeterminationId;
            }

            if(!empty($supportingDocInput))
            {
                $api_data['SupportingDocuments'] = $supportingDocInput;
            }


            $childNoLongerAtRisk = new ChildNoLongerAtRisk();
            $childNoLongerAtRisk->accs_id = $currentCertificateorDeterminationId;

            $childNoLongerAtRisk->date_no_longer_at_risk = $date_no_longer_at_risk;
            $childNoLongerAtRisk->supporting_docs = $supportingDocInput;
            $childNoLongerAtRisk->api_data = $api_data;
            $childNoLongerAtRisk->save();

            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);

            $message = json_encode([
                "organization" => $branch->organization_id,
                'branch' => $branch->id,
                "subjectid" => $childNoLongerAtRisk->id,
                "authpersonid" => $ccsOrg->person_id,
                "action" => "ACCS Advice Child No Longer At Risk"
            ]);

            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);

            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('child_no_longer_at_risk', AWSConfigType::SNS),
                'Subject' => 'ACCS Advice Child No Longer At Risk'
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

            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function deleteCertificate(Request $request) {

        DB::beginTransaction();

        try {

            $deleteACCS = ACCS::findOrFail($request->get('id'));
            $deleteACCS->delete();
    
            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_201
            );

        } catch (Exception $e) {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function cancelCertificate(Request $request) {

        DB::beginTransaction();

        try {

            $cancelACCS = ACCS::where('certificate_or_determination_id',$request->get('id'))->get()->first();
    
            if($cancelACCS)
            {
                //subject id for sns
                $cancelACCSID = $cancelACCS->id;
                // certificate or determination currently exists in db! update the cancellation reason only.
                $cancelACCS->update(['cancel_reason' => $request->get('cancellation_reason')]);
            }
            else
            {
                // certificate or determination is not in db! insert a new record with api data.
    
                $certificate_or_determination_api_data = $request->get('apiData');
                $certificate_or_determination_api_data['RiskReasons'] = $certificate_or_determination_api_data['RiskReasons']['results'];
    
                $child = Helpers::decodeHashedID($request->get('child'));
                $center = Helpers::decodeHashedID($request->get('center'));
    
    
                $child = Child::where('id',$child)->get()->first();
                $branch = Branch::where('id',$center)->get()->first();
                $typestring = (array_key_exists('certificateID',$certificate_or_determination_api_data)) ? 'Certificate' : 'Determination';
    
                $newACCSRecord = new ACCS();
                $newACCSRecord->certificate_or_determination_id = $request->get('id');
                $newACCSRecord->child_profile_id = $child->id;
                $newACCSRecord->organization_id = $branch->organization_id;
                $newACCSRecord->branch_id = $branch->id;
                $newACCSRecord->type = $typestring;
                $newACCSRecord->is_synced = 1;
                $newACCSRecord->certificate_or_determination_api_data = $certificate_or_determination_api_data;
                //$newACCSRecord->state_territory_data = $state_territory_data;
                $newACCSRecord->cancel_reason = $request->get('cancellation_reason');
                $newACCSRecord->save();
                $cancelACCSID = $newACCSRecord->id;
    
            }
    
            /* =========================== SNS ========================================*/
    
            $child = Helpers::decodeHashedID($request->get('child'));
            $child = Child::where('id',$child)->get()->first();
            $center = Helpers::decodeHashedID($request->get('center'));
    
            $branch = Branch::where('id',$center)->get()->first();
            $service = $branch->providerService;
    
            $ccsOrg = $this->ccsSetupRepo->findByBranch($branch->id, []);
    
            $message = json_encode([
                "organization" => $branch->organization_id,
                'branch' => $branch->id,
                "subjectid" => $cancelACCSID,
                "authpersonid" => $ccsOrg->person_id,
                "action" => "Cancel Certificate"
            ]);
    
            $sns = new SnsClient([
                'region' => 'ap-southeast-2',
                'version' => "2010-03-31",
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]);
    
            $result = $sns->publish([
                'Message' => $message,
                'TopicArn' => Helpers::getConfig('certificate_cancel', AWSConfigType::SNS),
                'Subject' => 'ACCS Certificate Cancel'
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
