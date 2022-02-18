<?php

namespace Kinderm8\Http\Controllers;


use Illuminate\Http\Response;
use Kinderm8\ChildConsents;
use Kinderm8\ChildDocuments;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CRMType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Kinderm8\Child;
use Kinderm8\Http\Resources\EnquiryResource;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Http\Resources\WaitlistNoteResourceCollection;
use Kinderm8\Models\Enquiries;
use Kinderm8\Models\WaitlistQuestions;
use Kinderm8\Notifications\SendCrmAdministrativeMail;
use Kinderm8\Organization;
use Kinderm8\Repositories\Child\ChildRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Allergy;
use Kinderm8\Http\Resources\EnrolmentMasterCollection;
use Kinderm8\Models\WaitlistEnrolmentQuestions;
use Kinderm8\Models\WaitlistEnrolmentSections;
use Kinderm8\Notifications\SendWaitlistConfirmationMail;
use Kinderm8\Notifications\SendEnrollmentForm;
use Kinderm8\Http\Resources\WaitlistResource;
use Kinderm8\Http\Resources\WaitlistResourceCollection;
use Kinderm8\Http\Resources\EnquiryResourceCollection;
use Kinderm8\Role;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\WaitlistEnquiryQuestions;
use Kinderm8\WaitListEnrollment;
use Kinderm8\Branch;
use Kinderm8\ChildCulturalDetails;
use Kinderm8\HealthAndMedical;
use Kinderm8\User;
use Kinderm8\WaitlistEnrolmentNotes;
use LocalizationHelper;
use phpDocumentor\Reflection\Types\False_;
use RequestHelper;
use PathHelper;
use Illuminate\Support\Facades\Log;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Notifications\OnSendParentEzidebitLink;
use Kinderm8\Notifications\SendUserSetupPasswordMail;
use Kinderm8\ParentPaymentMethod;
use Kinderm8\ParentPaymentProvider;
use Kinderm8\Repositories\Branch\IBranchRepository;
use WaitlistHelper;
use PaymentHelpers;

use function JmesPath\search;

/**
 * Class WaitListController
 * @package Kinderm8\Http\Controllers
 */
class WaitListController extends Controller
{

    /**
     * @var IUserRepository
     */
    private $userRepo;
    /**
     * @var SNSContract
     */
    private $snsService;
    /**
     * @var IBranchRepository
     */
    private $branchRepo;
    /**
     * @var ChildRepository
     */
    private $child;

    /**
     * WaitListController constructor.
     * @param SNSContract $snsService
     * @param IUserRepository $userRepo
     * @param IBranchRepository $branchRepo
     * @param ChildRepository $child
     */
    public function __construct(SNSContract $snsService, IUserRepository $userRepo, IBranchRepository $branchRepo, ChildRepository $child)
    {
        $this->userRepo = $userRepo;
        $this->snsService = $snsService;
        $this->branchRepo = $branchRepo;
        $this->child = $child;
    }

    /**
     * Handle the incoming request.
     *
     * @param Request $request
     * @return Response
     */

    public function storeWaitlist(Request $request)
    {

        try {
            $validator = Validator::make($request->all(), [
                'firstname' => ['required'],
                'lastname' => ['required'],
                'parentfirstname' => ['required'],
                'parentlastname' => ['required'],
                'email' => ['required'],
                'mobile' => ['required'],
                'org_id' => ['required'],
                'branch_id' => ['required'],
                'attachmentUrl' => ['required'],
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

            $org_id = Helpers::decodeHashedID($request->input('org_id'));
            $branch_id = Helpers::decodeHashedID($request->input('branch_id'));
            $enquiry_id = $request['enquiry_id'] == null ? false : Helpers::decodeHashedID($request->input('enquiry_id'));
            $attachmentUrl = $request->input('attachmentUrl');
            $bornOrNot = $request->input('childborn');
            $firstname = $request->input('firstname');
            $middlename = $request->input('middlename');
            $lastname = $request->input('lastname');
            $gender = $request->input('gender');
            $sibilings = $request->input('sibilings');
            $crn = $request->input('crn');
            $date_of_birth = $request->input('date_of_birth');
            $priority = $request->input('priority');
            $enrolment_date = $request->input('enrolment_date');
            $attendance = $request->input('attendance');
            $parentfirstname = $request->input('parentfirstname');
            $parentmiddlename = $request->input('parentmiddlename');
            $parentlastname = $request->input('parentlastname');
            $parent_dob = $request->input('parent_date_of_birth');
            $email = strtolower($request->input('email'));
            $parentcrn = $request->input('parentcrn');
            $address = $request->input('address');
            $suburb = $request->input('suburb');
            $country = $request->input('country');
            $postalCode = $request->input('postalCode');
            $state = $request->input('state');
            $phone = $request->input('phone');
            $mobile = $request->input('mobile');
            $parentWorkMob = $request->input('parentWorkMob');
            $parentWorkPN = $request->input('parentWorkPN');
            $hearAbout = $request->input('hearAbout');
            $hearAboutOther = $request->input('hearAboutOther');
            $new_inputs = $request->input('new_inputs');
            // Upload Files
            $upload_files = $request->input('upload_files');
            $user = User::where('email', $email)->get()->first();
            $number_of_sibilings = ($user) ? $user->child()->count() : 0;
            //$sibilings = (int)$number_of_sibilings > 0;


            $inputsForNewSections = [];
            /*accessible data set find (can branch,can organization or global) === waitlist*/

            $questionTable = new WaitlistQuestions();

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            $accessibility = '';

            if ($branchTemplateElements->isEmpty()) {
                $accessibility = 'organize_wise';
                $orgActiveWaitlist = true; // organize wise search
                $sections = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sections) {
                    $sections = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActiveWaitlist = false;
                    $accessibility = 'global';
                }
            } else {
                $sections = $questionTable::whereIn('access_for', ['both', 'enq-wait', 'waitlist'])->where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
            }

            /*accessible data set find (can branch,can organization or global) === enrolment*/

            $questionTable = new WaitlistEnrolmentQuestions();

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            $accessibilityEnrol = '';

            if ($branchTemplateElements->isEmpty()) {
                $accessibilityEnrol = 'organize_wise';
                $orgActiveEnrol = true; // organize wise search
                $sectionsEnrol = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sectionsEnrol) {
                    $sectionsEnrol = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActiveEnrol = false;
                    $accessibilityEnrol = 'global';
                }
            } else {
                $sectionsEnrol = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enrolment'])->where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
            }

            $newCollection = array();
            $newEnrolCollection = array();

            foreach ($new_inputs as $new_input) {
                foreach ($new_input['data'] as $input) {
                    $unnecessary = true;

                    /*waitlist filter*/
                    $branchElelmentWaitlist = WaitlistQuestions::whereIn('section_id', $sections)->where('section_id', Helpers::decodeHashedID($new_input['section_id']))->where('input_name', $input['name']);

                    if ($accessibility !== '') {
                        $branchElelmentWaitlist = ($orgActiveWaitlist) ? $branchElelmentWaitlist->where('organization_id', $org_id)->where('branch_id', null) : $branchElelmentWaitlist->where('organization_id', null)->where('branch_id', null);
                    } else {
                        $branchElelmentWaitlist = $branchElelmentWaitlist->where('organization_id', $org_id)->where('branch_id', $branch_id);
                    }
                    $branchElelmentWaitlist = $branchElelmentWaitlist->get();
                    /* / waitlist filter*/

                    /*enrolment filter*/
                    $branchElementEnrolment = WaitlistEnrolmentQuestions::whereIn('section_id', $sectionsEnrol)->where('input_name', $input['name'])->where('hidden', '=', 1);

                    if ($accessibilityEnrol !== '') {
                        $branchElementEnrolment = ($orgActiveEnrol) ? $branchElementEnrolment->where('organization_id', $org_id)->where('branch_id', null) : $branchElementEnrolment->where('organization_id', null)->where('branch_id', null);
                    } else {
                        $branchElementEnrolment = $branchElementEnrolment->where('organization_id', $org_id)->where('branch_id', $branch_id);
                    }
                    $branchElementEnrolment = $branchElementEnrolment->get();
                    /* / enrolment filter*/

                    //firstly check not enrolment related  inputs with section name. if enrolment not included it get from waitlist new inputs
                    if (!$branchElelmentWaitlist->isEmpty()) {

                        $branchElelmentWaitlist = $branchElelmentWaitlist->first();
                        $input += ['waitlist_section' => $new_input['section']];
                        $input += ['section' => '']; // by default set enrolment inputs section. depend on inputs effective to wwaitlist by to enrolment
                        $input += ['input_type' => $branchElelmentWaitlist['input_type']];
                        $input += ['question' => $branchElelmentWaitlist['question']];
                        $input += ['placeholder' => $branchElelmentWaitlist['input_placeholder']];
                        $input += ['required' => $branchElelmentWaitlist['input_mandatory'] ? false : true];
                        $input += ['types' => $branchElelmentWaitlist['types']];
                        $input += ['height' => $branchElelmentWaitlist['column_height']];
                        $input += ['order' => $branchElelmentWaitlist['column_order']];
                        if ($branchElelmentWaitlist['input_type'] == 'date-picker') {
                            $input['values'] = ($input['values'] != '') ? date('Y-m-d', strtotime($input['values'])) : '';
                        }

                        $section = WaitlistEnrolmentSections::find($branchElelmentWaitlist['section_id']);

                        $inputsForNewSections['waitlist'][$new_input['section']]['name'] = $section['section_name'];
                        $inputsForNewSections['waitlist'][$new_input['section']]['code'] = $section['section_code'];
                        $inputsForNewSections['waitlist'][$new_input['section']]['order'] = $section['section_order'];
                        $inputsForNewSections['waitlist'][$new_input['section']]['inputs'][] = $input['name'];

                        $newCollection [] = $input;
                    }

                    if (!$branchElementEnrolment->isEmpty()) {
                        $branchElelment = $branchElementEnrolment->first();

                        $section = WaitlistEnrolmentSections::find($branchElelment['section_id']);
                        unset($input['waitlist_section']);
                        unset($input['section']);
                        $input += ['waitlist_section' => ''];
                        $input += ['section' => $section['section_code']]; // by default set enrolment inputs section. depend on inputs effective to waitlist by to enrolment
                        if ($branchElelment['input_type'] == 'date-picker') {
                            $input['values'] = ($input['values'] != '') ? date('Y-m-d', strtotime($input['values'])) : '';
                        }


                        $newEnrolCollection [] = $input;
                    }

                }
            }
            unset($branchElelmentWaitlist);
            unset($branchElementEnrolment);

            $enrolInputs = array();
            foreach ($newEnrolCollection as $key => $singleInput) {
                if ($singleInput['section'] !== '' && !($singleInput['values'] === null || $singleInput['values'] === '')) {/* remove unnecessary */
                    array_push($enrolInputs, $newEnrolCollection[$key]);
                }
            }

            /*enquiry to enrolment answers get back*/
            if ($enquiry_id) {
                $enrolInputsData = Enquiries::find($enquiry_id);
                if (isset($enrolInputsData['enquiry_info']['new_inputs'])) {
                    $enrolInputsData = $enrolInputsData['enquiry_info']['new_inputs'];
                    foreach ($enrolInputsData as $key => $singleInput) {

                        if ($singleInput['section'] !== '' && !($singleInput['values'] === null || $singleInput['values'] === '')) {/* remove unnecessary */
                            if (array_search($singleInput['name'], array_column($enrolInputs, 'name')) == null) {
                                array_push($enrolInputs, $enrolInputsData[array_search($singleInput['name'], array_column($enrolInputsData, 'name'))]);
                            }
                        }
                    }
                    $enrolInputs = array_values($enrolInputs);
                }
            }

            //   enrolment for only unique inputs record

            $branchElementEnrolment = WaitlistEnrolmentQuestions::with('section')->where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id);
            if ($branchElementEnrolment->get()->isEmpty()) {

                $branchElementEnrolment = WaitlistEnrolmentQuestions::with('section')->where('organization_id', '=', $org_id)->where('branch_id', '=', null);
                if ($branchElementEnrolment->get()->isEmpty()) {

                    $branchElementEnrolment = WaitlistEnrolmentQuestions::with('section')->where('organization_id', '=', null)->where('branch_id', '=', null);
                }
            }

            $branchElementEnrolment = $branchElementEnrolment
                ->where('hidden', '=', '1')
                ->orderBy('column_order', 'ASC')->get();

            if (!$branchElementEnrolment->isEmpty()) {
                foreach ($branchElementEnrolment->toArray() as $enrols) {

                    $newCollection [] = array(
                        'waitlist_section' => '',
                        'values' => array_search($enrols['input_name'], array_column($enrolInputs, 'name')) === false ? '' : $enrolInputs[array_search($enrols['input_name'], array_column($enrolInputs, 'name'))]['values'],
                        'name' => $enrols['input_name'],
                        'section' => $enrols['section']['section_code'],
                        'input_type' => $enrols['input_type'],
                        'question' => $enrols['question'],
                        'placeholder' => $enrols['input_placeholder'],
                        'required' => $enrols['input_mandatory'] ? false : true,
                        'types' => $enrols['types'],
                        'height' => $enrols['column_height'],
                        'order' => $enrols['column_order'],
                    );

                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['name'] = $enrols['section']['section_name'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['code'] = $enrols['section']['section_code'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['order'] = $enrols['section']['section_order'];
                    $inputsForNewSections['enrolment'][$enrols['section']['section_code']]['inputs'][] = $enrols['input_name'];
                }
            }

            $keys = array_column($newCollection, 'order');
            array_multisort($keys, SORT_ASC, $newCollection);

            unset($branchElementEnrolment);

            $waitListObj = [
                'child_bornOrNot' => $bornOrNot,
                'child_firstname' => ($firstname != '') ? $firstname : '',
                'child_middlename' => ($middlename != '') ? $middlename : '',
                'child_lastname' => ($lastname != '') ? $lastname : '',
                'child_gender' => $gender,
                'sibilings' => $sibilings,
                'number_of_sibilings' => $number_of_sibilings,
                'chil_crn' => ($crn != '') ? $crn : '',
                'child_date_of_birth' => ($date_of_birth != '') ? $date_of_birth : '',
                'enrollment_start_date' => ($enrolment_date != '') ? $enrolment_date : '',
                'attendance' => $attendance,

                'priority' => ($priority != '') ? $priority : '',
                'parent_firstname' => ($parentfirstname != '') ? $parentfirstname : '',
                'parent_middlename' => ($parentmiddlename != '') ? $parentmiddlename : '',
                'parent_lastname' => ($parentlastname != '') ? $parentlastname : '',
                'parent_dob' => ($parent_dob != '') ? $parent_dob : '',
                'email' => ($email != '') ? $email : '',
                'parent_crn' => ($parentcrn != '') ? $parentcrn : '',
                'parent_address' => ($address != '') ? $address : '',
                'parent_country' => ($country != '') ? $country : '',
                'parent_suburb' => ($suburb != '') ? $suburb : '',
                'parent_postalCode' => ($postalCode != '') ? $postalCode : '',
                'parent_state' => ($state != '') ? $state : '',
                'parent_phone' => ($phone != '') ? $phone : '',
                'parent_mobile' => ($mobile != '') ? $mobile : '',
                'parentWorkMob' => ($parentWorkMob != '') ? $parentWorkMob : '',
                'parentWorkPN' => ($parentWorkPN != '') ? $parentWorkPN : '',
                'hearAbout' => ($hearAbout != '') ? $hearAbout : '',
                'hearAboutOther' => ($hearAboutOther != '') ? $hearAboutOther : '',
                'bookings' => $attendance,
                'allergiesArray' => '',
                'emergencyContacts' => '',
                'new_inputs' => $newCollection,
                //    'waitlist_element_settings' => $this->DynamicDataColumnConverter($branch_id, $org_id, 'waitlist'),
                //    'element_settings' => $this->DynamicDataColumnConverter($branch_id, $org_id, 'enrolment'),
                'attachment_url' => $attachmentUrl,
                'section_inputs' => $inputsForNewSections,
                'upload_files' => $upload_files
            ];

            DB::beginTransaction();
            $newWaitlist = new WaitListEnrollment();

            $newWaitlist->organization_id = $org_id;
            $newWaitlist->branch_id = $branch_id;
            $newWaitlist->waitlist_info = $waitListObj;
            $newWaitlist->save();

            if ($request->enquiry_id) {
                $enquiry = Enquiries::find(Helpers::decodeHashedID($request->enquiry_id));
                $enquiry->enquiry_info = array_merge($enquiry->enquiry_info, array('waitlist_enrolment_id' => $newWaitlist->id));
                $enquiry->status = 3;  /* update enquiry status once waitlist created */
                $enquiry->save();

                /* relavant Enquiry Notes mapping with freshly created waitlist_enrolment_id*/
                WaitlistEnrolmentNotes::where('enquiry_waitlist_enrolment_id', $enquiry->id)->where('type', 0)->update(['enquiry_waitlist_enrolment_id' => $newWaitlist->id, 'type' => 1]);
            }

            DB::commit();

            $branch = Branch::find($branch_id);
            $branch_name = ($branch) ? $branch->subdomain_name : '';

            /* branch managers for send notification*/
            $braMangers = $this->userRepo->findAdministrativeUsersForBranchWithEmailSettings($org_id, $branch_id, '', false, false, false);


            foreach ($braMangers as $braManager) {
                $canSend = true;
                $emailTypes = $braManager->emailTypes;
                if (!empty($emailTypes) && sizeof($emailTypes) != 0) {
                    $key = array_search(CRMType::WAITLIST_CODE, array_column(json_decode(json_encode($braManager->emailTypes), true), 'type'));
                    if (isset($emailTypes[$key]['pivot']['status']) && !$emailTypes[$key]['pivot']['status']) {
                        $canSend = false;
                    }
                }

                if ($canSend) {
                    Log::info('Email Type : waitlist | branch :' . $branch_name . ' | Email owner organization->branch : ' . $braManager->organization->company_name . '->' . (isset($braManager->branch->subdomain_name) ? $braManager->branch['subdomain_name'] : ' SITE MANAGER | ') . ' | email:  ' . $braManager->email);
                    $braManager->notify(new SendCrmAdministrativeMail(
                        $branch,
                        'waitlist',
                        $branch_name . ' - ' . LocalizationHelper::getTranslatedText('email.crm_waitlist_add')));
                }
            }

            /*------------- Send Mail --------------*/

            $newWaitlist->notify(new SendWaitlistConfirmationMail($branch_name));

            // DB::commit();
            $branch_settings = $branch->center_settings;
            $redirect_url = (isset($branch_settings['enquiry_redirection_url']) && ($branch_settings['enquiry_redirection_url'] != '')) ? $branch_settings['enquiry_redirection_url'] : '';


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $redirect_url
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * @throws Exception
     */
    public function storeEnquiry(Request $request)
    {

        try {
            $validator = Validator::make($request->all(), [
                'parentfirstname' => ['required'],
                'parentlastname' => ['required'],
                'parentEmail' => ['required'],
                'branch_id' => ['required'],
                'org_id' => ['required'],
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

            $org_id = Helpers::decodeHashedID($request->input('org_id'));
            $branch_id = Helpers::decodeHashedID($request->input('branch_id'));

            $parentfirstname = $request->input('parentfirstname');
            $parentlastname = $request->input('parentlastname');
            $parentMobile = $request->input('parentMobile') ?? '';
            $parentEmail = strtolower($request->input('parentEmail'));
            $childAge = $request->input('childAge') ?? '';
            $new_inputs = $request->input('new_inputs');
            // Upload Files
            $upload_files = $request->input('upload_files');

            $inputsForNewSections = [];

            $questionTable = new WaitlistQuestions();

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            $accessibilityWait = '';

            if ($branchTemplateElements->isEmpty()) {
                $accessibilityWait = 'organize_wise';
                $orgActiveEnrol = true; // organize wise search
                $sectionsWait = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sectionsWait) {
                    $sectionsWait = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActiveEnrol = false;
                    $accessibilityWait = 'global';
                }
            } else {
                $sectionsWait = $questionTable::whereIn('access_for', ['both', 'waitlist', 'enq-wait'])->where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
            }

            /*accessible data set find (can branch,can organization or global) === enrolment*/

            $questionTable = new WaitlistEnquiryQuestions();

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            $accessibilityEnrol = '';

            if ($branchTemplateElements->isEmpty()) {
                $accessibilityEnrol = 'organize_wise';
                $orgActiveEnrol = true; // organize wise search
                $sectionsEnq = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sectionsEnq) {
                    $sectionsEnq = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActiveEnrol = false;
                    $accessibilityEnrol = 'global';
                }
            } else {
                $sectionsEnq = $questionTable::where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
            }

            $allUpdatedInputs = array();
            foreach ($new_inputs as $new_input) {
                foreach ($new_input['data'] as $input) {
                    array_push($allUpdatedInputs, $input);
                }
            }

            /*Waitlist filter*/
            $branchElementWait = WaitlistQuestions::with('section')->whereIn('section_id', $sectionsWait)->whereIn('access_for', ['both', 'enq-wait', 'waitlist']);

            if ($accessibilityWait !== '') {
                $branchElementWait = ($orgActiveEnrol) ? $branchElementWait->where('organization_id', $org_id)->where('branch_id', null) : $branchElementWait->where('organization_id', null)->where('branch_id', null);
            } else {
                $branchElementWait = $branchElementWait->where('organization_id', $org_id)->where('branch_id', $branch_id);
            }
            /* / Waitlist filter*/

            /*  waitlist for only unique inputs record */
            $branchElementWait = $branchElementWait->where('hidden', '=', '1')
                ->orderBy('column_order', 'ASC')->get();


            $newCollection = array();

            if (!$branchElementWait->isEmpty()) {
                foreach ($branchElementWait->toArray() as $waits) {

                    /* values access if available*/
                    $key = array_search($waits['input_name'], array_column($allUpdatedInputs, 'name'));

                    $value = '';
                    if (is_numeric($key)) {
                        $value = $allUpdatedInputs[$key]['values'];
                    }

                    $newCollection [] = array(
                        'waitlist_section' => $waits['section']['section_code'],
                        'values' => $value,
                        'name' => $waits['input_name'],
                        'section' => '',
                        'input_type' => $waits['input_type'],
                        'question' => $waits['question'],
                        'placeholder' => $waits['input_placeholder'],
                        'required' => $waits['input_mandatory'] ? false : true,
                        'types' => $waits['types'],
                        'height' => $waits['column_height'],
                        'order' => $waits['column_order'],
                    );
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['name'] = $waits['section']['section_name'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['code'] = $waits['section']['section_code'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['order'] = $waits['section']['section_order'];
                    $inputsForNewSections['waitlist'][$waits['section']['section_code']]['inputs'][] = $waits['input_name'];
                }
            }
            //  </ waitlist for only unique inputs record >


            /*enrolment filter*/
            $branchElementEnq = WaitlistEnquiryQuestions::with('section')->whereIn('section_id', $sectionsEnq);

            if ($accessibilityEnrol !== '') {
                $branchElementEnq = ($orgActiveEnrol) ? $branchElementEnq->where('organization_id', $org_id)->where('branch_id', null) : $branchElementEnq->where('organization_id', null)->where('branch_id', null);
            } else {
                $branchElementEnq = $branchElementEnq->where('organization_id', $org_id)->where('branch_id', $branch_id);
            }
            /* / enrolment filter*/

            //   enrolment for only unique inputs record
            $branchElementEnq = $branchElementEnq->where('hidden', '=', '1')
                ->orderBy('column_order', 'ASC')->get();


            if (!$branchElementEnq->isEmpty()) {
                foreach ($branchElementEnq->toArray() as $enq) {

                    /* values access if available*/
                    $key = array_search($enq['input_name'], array_column($allUpdatedInputs, 'name'));

                    $value = '';
                    if (is_numeric($key)) {
                        $value = $allUpdatedInputs[$key]['values'];
                    }

                    $newCollection [] = array(
                        'waitlist_section' => '',
                        'enquiry_section' => $enq['section']['section_code'],
                        'values' => $value,
                        'name' => $enq['input_name'],
                        'section' => '',
                        'input_type' => $enq['input_type'],
                        'question' => $enq['question'],
                        'placeholder' => $enq['input_placeholder'],
                        'required' => $enq['input_mandatory'] ? false : true,
                        'types' => $enq['types'],
                        'height' => $enq['column_height'],
                        'order' => $enq['column_order'],
                    );
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['name'] = $enq['section']['section_name'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['code'] = $enq['section']['section_code'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['order'] = $enq['section']['section_order'];
                    $inputsForNewSections['enquiry'][$enq['section']['section_code']]['inputs'][] = $enq['input_name'];
                }
            }

            //    $keys = array_column($newCollection, 'order');
            //    array_multisort($keys, SORT_ASC, $newCollection);

            unset($branchElementWait);
            unset($branchElementEnq);

            $waitListObj = [
                'firstname' => ($parentfirstname != '') ? $parentfirstname : '',
                'lastname' => ($parentlastname != '') ? $parentlastname : '',
                'email' => ($parentEmail != '') ? $parentEmail : '',
                'mobile' => ($parentMobile != '') ? $parentMobile : '',
                'age' => ($childAge != '') ? $childAge : '',
                'new_inputs' => $newCollection,
                //    'waitlist_element_settings' => $this->DynamicDataColumnConverter($branch_id, $org_id, 'waitlist'),
                'section_inputs' => $inputsForNewSections,
                'upload_files' => $upload_files
            ];

            DB::beginTransaction();
            $newWaitlist = new Enquiries();
            $newWaitlist->organization_id = $org_id;
            $newWaitlist->branch_id = $branch_id;
            $newWaitlist->enquiry_info = $waitListObj;
            $newWaitlist->status = 0;
            $newWaitlist->save();

            DB::commit();

            $branch = Branch::find($branch_id);
            $branch_name = ($branch) ? $branch->subdomain_name : '';
            /* branch managers for send notification*/
            $braMangers = $this->userRepo->findAdministrativeUsersForBranchWithEmailSettings($org_id, $branch_id, '', false, false, false);

            foreach ($braMangers as $braManager) {
                $canSend = true;
                $emailTypes = $braManager->emailTypes;
                if (!empty($emailTypes) && sizeof($emailTypes) != 0) {
                    $key = array_search(CRMType::ENQUIRY_CODE, array_column(json_decode(json_encode($braManager->emailTypes), true), 'type'));
                    if (isset($emailTypes[$key]['pivot']['status']) && !$emailTypes[$key]['pivot']['status']) {
                        $canSend = false;
                    }
                }

                if ($canSend) {
                    Log::info('Email Type : enquiry | branch :' . $branch_name . ' | Email owner organization->branch : ' . $braManager->organization->company_name . '->' . (isset($braManager->branch->subdomain_name) ? $braManager->branch['subdomain_name'] : ' SITE MANAGER | ') . ' | email:  ' . $braManager->email);
                    $braManager->notify(new SendCrmAdministrativeMail(
                        $branch,
                        'enquiry',
                        $branch_name . ' - ' . LocalizationHelper::getTranslatedText('email.crm_enquiry_add')));
                }
            }

            $branch_settings = $branch->center_settings;
            $redirect_url = (isset($branch_settings['enquiry_redirection_url']) && ($branch_settings['enquiry_redirection_url'] != '')) ? $branch_settings['enquiry_redirection_url'] : '';

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $redirect_url
                ),
                RequestType::CODE_200
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request)
    {
        DB::beginTransaction();
        try {

            $validator = Validator::make($request->all(), [
                'firstname' => ['required'],
                'lastname' => ['required'],
                'parentfirstname' => ['required'],
                'parentlastname' => ['required'],
                'email' => ['required'],
                'mobile' => ['required'],
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

            $bornOrNot = $request->input('childborn');
            $firstname = $request->input('firstname');
            $middlename = $request->input('middlename');
            $lastname = $request->input('lastname');
            $gender = $request->input('gender');
            $sibilings = $request->input('sibilings');
            $crn = $request->input('crn');
            $date_of_birth = $request->input('date_of_birth');
            $priority = $request->input('priority');
            $enrolment_date = $request->input('enrolment_date');
            $attendance = $request->input('attendance');
            $parentfirstname = $request->input('parentfirstname');
            $parentmiddlename = $request->input('parentmiddlename');
            $parentlastname = $request->input('parentlastname');
            $parent_dob = $request->input('parent_date_of_birth');
            $email = strtolower($request->input('email'));
            $parentcrn = $request->input('parentcrn');
            $address = $request->input('address');
            $suburb = $request->input('suburb');
            $country = $request->input('country');
            $postalCode = $request->input('postalCode');
            $state = $request->input('state');
            $phone = $request->input('phone');
            $mobile = $request->input('mobile');
            $parentWorkMob = $request->input('parentWorkMob');
            $parentWorkPN = $request->input('parentWorkPN');
            $hearAbout = $request->input('hearAbout');
            $hearAboutOther = $request->input('hearAboutOther');
            $upload_files = $request->input('upload_files');

            $user = User::where('email', $email)->get()->first();
            $number_of_sibilings = ($user) ? $user->child()->count() : 0;
            //    $sibilings = (int)$number_of_sibilings > 0;

            /*if direct waitlist, create a waitlist(enquery to waitlist directly covert) */
            if (isset($request->directWaitlist) && $request->directWaitlist) {
                $enquiry = Enquiries::find(Helpers::decodeHashedID($request->input('id')));
                $enquiry->status = 3;
                $enquiry->save();

                $newWaitlist = new WaitListEnrollment();
                $newWaitlist->organization_id = $enquiry->organization_id;
                $newWaitlist->branch_id = $enquiry->branch_id;
                $newWaitlist->waitlist_info = $enquiry->enquiry_info;
                $newWaitlist->status = 0;
                $newWaitlist->save();

                /* relavant Enquiry Notes mapping with freshly created waitlist_enrolment_id*/
                WaitlistEnrolmentNotes::where('enquiry_waitlist_enrolment_id', $enquiry->id)->where('type', 0)->update(['enquiry_waitlist_enrolment_id' => $newWaitlist->id, 'type' => 1]);

            } else {
                $newWaitlist = WaitListEnrollment::find(Helpers::decodeHashedID($request->input('id')));
            }


            /* enrollment data */

            //    $elementSettings = (isset($newWaitlist->waitlist_info['waitlist_element_settings']) && $newWaitlist->waitlist_info['waitlist_element_settings'] != '') ? $newWaitlist->waitlist_info['waitlist_element_settings'] : '';
            //    $enrolment_elementSettings = (isset($newWaitlist->waitlist_info['element_settings']) && $newWaitlist->waitlist_info['element_settings'] != '') ? $newWaitlist->waitlist_info['element_settings'] : '';
            $attachmentUrl = (isset($newWaitlist->waitlist_info['attachment_url']) && $newWaitlist->waitlist_info['attachment_url'] != '') ? $newWaitlist->waitlist_info['attachment_url'] : '';


            $inputsForNewSections = (isset($newWaitlist->waitlist_info['section_inputs']) && $newWaitlist->waitlist_info['section_inputs'] != '') ? $newWaitlist->waitlist_info['section_inputs'] : null;
            $newInputs = isset($newWaitlist->waitlist_info['new_inputs']) ? $newWaitlist->waitlist_info['new_inputs'] : [];

            if (is_null($inputsForNewSections)) {
                $missedData = WaitlistHelper::codeForOlderWaitlistInfoGenarate($newWaitlist->waitlist_info, $newWaitlist->organization_id, $newWaitlist->branch_id, $newWaitlist->status, true);
                $inputsForNewSections = $missedData['section_inputs'];
                $newInputs = $missedData['new_inputs'];
            }


            if (isset($request->directWaitlist) && $request->directWaitlist) {
                $missedData = WaitlistHelper::codeForOlderWaitlistInfoGenarate($newWaitlist->waitlist_info, $newWaitlist->organization_id, $newWaitlist->branch_id, $newWaitlist->status, false);
                $inputsForNewSections = $missedData['section_inputs'];
                $newInputs = $missedData['new_inputs'];
            }

            /*new inputs values change with values updatation on edit view*/
            $receilvedNewInputs = $request->input('updatedAllInputs');


            $waitlistInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return $k['waitlist_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            $enrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));


            foreach ($receilvedNewInputs as $key => $receilvedNewInput) {

                /* waitlist inputs for values update*/
                $key = array_search($receilvedNewInput['name'], array_column($waitlistInputsOnly, 'name'));

                if (is_numeric($key)) {
                    $value = $receilvedNewInput['values'];
                    if ($waitlistInputsOnly[$key]['input_type'] == 'date-picker') {
                        $value = ($receilvedNewInput['values'] != '') ? date('Y-m-d', strtotime($receilvedNewInput['values'])) : '';
                    }
                    $waitlistInputsOnly[$key]['values'] = $value;
                }

                /* enrolments for inputs for values update*/
                $key = array_search($receilvedNewInput['name'], array_column($enrolmentInputsOnly, 'name'));

                if (is_numeric($key)) {
                    $value = $receilvedNewInput['values'];
                    if ($enrolmentInputsOnly[$key]['input_type'] == 'date-picker') {
                        $value = ($receilvedNewInput['values'] != '') ? date('Y-m-d', strtotime($receilvedNewInput['values'])) : '';
                    }
                    $enrolmentInputsOnly[$key]['values'] = $value;
                }
            }
            $newInputs = array_merge($waitlistInputsOnly, $enrolmentInputsOnly);

            $waitListObj = [
                'child_bornOrNot' => $bornOrNot,
                'child_firstname' => ($firstname != '') ? $firstname : '',
                'child_middlename' => ($middlename != '') ? $middlename : '',
                'child_lastname' => ($lastname != '') ? $lastname : '',
                'child_gender' => $gender,
                'sibilings' => $sibilings,
                'number_of_sibilings' => $number_of_sibilings,
                'chil_crn' => ($crn != '') ? $crn : '',
                'child_date_of_birth' => ($date_of_birth != '') ? $date_of_birth : '',
                'enrollment_start_date' => ($enrolment_date != '') ? $enrolment_date : '',
                'attendance' => $attendance,
                'priority' => ($priority != '') ? $priority : '',
                'parent_firstname' => ($parentfirstname != '') ? $parentfirstname : '',
                'parent_middlename' => ($parentmiddlename != '') ? $parentmiddlename : '',
                'parent_lastname' => ($parentlastname != '') ? $parentlastname : '',
                'parent_dob' => ($parent_dob != '') ? $parent_dob : '',
                'email' => ($email != '') ? $email : '',
                'parent_crn' => ($parentcrn != '') ? $parentcrn : '',
                'parent_address' => ($address != '') ? $address : '',
                'parent_country' => ($country != '') ? $country : '',
                'parent_suburb' => ($suburb != '') ? $suburb : '',
                'parent_postalCode' => ($postalCode != '') ? $postalCode : '',
                'parent_state' => ($state != '') ? $state : '',
                'parent_phone' => ($phone != '') ? $phone : '',
                'parent_mobile' => ($mobile != '') ? $mobile : '',
                'parentWorkMob' => ($parentWorkMob != '') ? $parentWorkMob : '',
                'parentWorkPN' => ($parentWorkPN != '') ? $parentWorkPN : '',
                'hearAbout' => ($hearAbout != '') ? $hearAbout : '',
                'hearAboutOther' => ($hearAboutOther != '') ? $hearAboutOther : '',
                //    'waitlist_element_settings' => ($elementSettings != '') ? $elementSettings : '',
                //    'element_settings' => ($enrolment_elementSettings != '') ? $enrolment_elementSettings : '',
                'new_inputs' => ($newInputs != '') ? $newInputs : '',
                'bookings' => $attendance,
                'attachmentUrl' => $attachmentUrl,
                'section_inputs' => $inputsForNewSections,
                'upload_files' => $upload_files
            ];


            $newWaitlist->waitlist_info = $waitListObj;
            $newWaitlist->save();

            DB::commit();

            $branch = Branch::find($newWaitlist->branch_id);
            $branch_name = ($branch) ? $branch->subdomain_name : '';
            /*------------- Send Mail --------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function enquiryUpdate(Request $request): \Illuminate\Http\JsonResponse
    {
        DB::beginTransaction();
        try {
            $validator = Validator::make($request->all(), [
                'updatedAllInputs' => ['required'],
                'email' => ['required'],
                'firstname' => ['required'],
                'lastname' => ['required'],
            ]);


            /* validator*/
            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $enquiryinfo = Enquiries::find(Helpers::decodeHashedID($request->input('id')));
            $receilvedNewInputs = $request->input('updatedAllInputs');
            $upload_files = $request->input('upload_files');

            /*new inputs values change with values update on edit view*/

            $section_inputs = (isset($enquiryinfo->enquiry_info['section_inputs']) && $enquiryinfo->enquiry_info['section_inputs'] != '') ? $enquiryinfo->enquiry_info['section_inputs'] : null;
            $newInputs = $enquiryinfo->enquiry_info['new_inputs'];

            if (is_null($section_inputs) || sizeof($newInputs) == 0) {
                $missedData = WaitlistHelper::codeForOlderWaitlistInfoGenarate($enquiryinfo->enquiry_info, $enquiryinfo->organization_id, $enquiryinfo->branch_id, 5, true);
                $section_inputs = $missedData['section_inputs'];
                $newInputs = $missedData['new_inputs'];
            }

            $enrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return isset($k['enquiry_section']) && $k['enquiry_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            foreach ($receilvedNewInputs as $key => $receilvedNewInput) {

                /* enrolments for inputs for values update*/
                $key = array_search($receilvedNewInput['name'], array_column($enrolmentInputsOnly, 'name'));

                if (is_numeric($key)) {
                    $value = $receilvedNewInput['values'];
                    if ($enrolmentInputsOnly[$key]['input_type'] == 'date-picker') {
                        $value = ($receilvedNewInput['values'] != '') ? date('Y-m-d', strtotime($receilvedNewInput['values'])) : '';
                    }
                    $enrolmentInputsOnly[$key]['values'] = $value;
                }
            }
            $newInputs = $enrolmentInputsOnly;

            /* -----------------END extra details for enquiry form submit */
            $enqListObj = [
                'email' => strtolower($request->input('email')),
                'firstname' => $request->input('firstname'),
                'lastname' => $request->input('lastname'),
                'mobile' => !Helpers::IsNullOrEmpty($request->input('mobile')) ? $request->input('mobile') : '',
                'age' => !Helpers::IsNullOrEmpty($request->input('age')) ? $request->input('age') : '',
                'new_inputs' => $newInputs,
                'upload_files' => $upload_files,
                'section_inputs' => $section_inputs
                /* -----------------END extra details for enquiry form submit */
            ];

            $enquiryinfo->enquiry_info = $enqListObj;

            $enquiryinfo->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function get(Request $request)
    {

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int)$request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            $user_organization_id = auth()->user()->organization_id;
            $user_branch_id = auth()->user()->branch_id;
            if (isset($filters->branch) && $filters->branch != '') {
                $filterBranchId = (auth()->user()->hasOwnerAccess()) ? Helpers::decodeHashedID($filters->branch) : $user_branch_id;
            } elseif (!isset($filters->branch)) {
                $filterBranchId = (auth()->user()->hasOwnerAccess()) ? '' : $user_branch_id;
            }

            if (isset($filters->status) && $filters->status != 5) {

                $waitlistObj = WaitListEnrollment::with('branch')->where('organization_id', '=', $user_organization_id);

                $waitlistObj = (auth()->user()->hasOwnerAccess() && $filterBranchId == '') ? $waitlistObj->orderBy('created_at', 'desc') : $waitlistObj->where('branch_id', '=', $filterBranchId)->orderBy('created_at', 'desc');

                //search
                if (!is_null($searchValue)) {
                    $waitlistObj->where('waitlist_info', 'ILIKE', '%' . $searchValue . '%');
                }

                //filters
                if (!is_null($filters)) {

                    if (isset($filters->expected_start_date) && isset($filters->expected_end_date)) {
                        $waitlistObj->whereBetween('waitlist_info->enrollment_start_date', [$filters->expected_start_date, $filters->expected_end_date]);
                    }

                    if (isset($filters->priority)) {
                        $waitlistObj->whereLike('waitlist_info->priority', $filters->priority);
                    }

                    if (isset($filters->application_start_date) && isset($filters->application_end_date)) {
                        $waitlistObj->whereBetween('created_at', [$filters->application_start_date, $filters->application_end_date]);
                    }

                    if (isset($filters->status) && $filters->status != 4) {
                        $filters->status == 0 ? $waitlistObj->whereIn('status', [0, 1]) : $waitlistObj->whereLike('status', $filters->status);
                    }

                    if (isset($filters->age)) {
                        $data = $waitlistObj;
                        $id_arr = array();

                        foreach ($data->get() as $value) {
                            $startTime = Carbon::parse($value->waitlist_info['child_date_of_birth']);
                            $age = $startTime->diffInYears(Carbon::now()->format('Y-m-d'));

                            if ($filters->age == 0 && $age < 1) {
                                array_push($id_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->age == 1 && $age <= 2 && $age >= 1) {
                                array_push($id_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->age == 2 && $age <= 4 && $age >= 3) {
                                array_push($id_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->age == 0 && $age >= 5) {
                                array_push($id_arr, Helpers::decodeHashedID($value->index));
                            }
                        }

                        $waitlistObj = WaitListEnrollment::whereIn('id', $id_arr)->orderBy('created_at', 'desc');

                    }

                    if (isset($filters->gender)) {
                        $waitlistObj->where('waitlist_info->child_gender', $filters->gender);
                    }

                    if (isset($filters->sibilings)) {
                        $waitlistObj->where('waitlist_info->number_of_sibilings', $filters->sibilings);
                    }

                    if (isset($filters->branch)) {
                        $waitlistObj->where('branch_id', '=', $filterBranchId);
                    }

                    if (isset($filters->days_waiting)) {
                        $data = $waitlistObj;
                        $temp_arr = array();

                        foreach ($data->get() as $value) {
                            if ($filters->days_waiting === '<=7' && $value->number_of_days <= 7) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->days_waiting === '<=14' && $value->number_of_days <= 14) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->days_waiting === '<=30' && $value->number_of_days <= 30) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->days_waiting === '<=60' && $value->number_of_days <= 60) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->days_waiting === '<=90' && $value->number_of_days <= 90) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            } elseif ($filters->days_waiting === '>90' && $value->number_of_days > 90) {
                                array_push($temp_arr, Helpers::decodeHashedID($value->index));
                            }
                        }

                        $waitlistObj = WaitListEnrollment::whereIn('id', $temp_arr)->orderBy('created_at', 'desc');

                    }

                }
                $dataObj = WaitListEnrollment::where('organization_id', '=', $user_organization_id);
                $dataObj = (auth()->user()->hasOwnerAccess() && $filterBranchId == '') ? $dataObj->get() : $dataObj->where('branch_id', '=', $filterBranchId)->get();
                $waitllistCount = $dataObj->whereIn('status', [0, 1])->count();
                $emailedCount = $dataObj->where('status', 1)->count();
                $enroledtCount = $dataObj->where('status', 2)->count();
                $activetCount = $dataObj->where('status', 3)->count();

                //get actual count
                $actualCount = $waitlistObj->get()->count();

                $enquiredCount = Enquiries::where('organization_id', '=', $user_organization_id)->where('status', '!=', 3);
                $enquiredCount = (auth()->user()->hasOwnerAccess() && $filterBranchId == '') ? $enquiredCount->count() : $enquiredCount->where('branch_id', '=', $filterBranchId)->count();
                $waitlistObj = $waitlistObj->paginate($offset);

                return (new WaitlistResourceCollection($waitlistObj))
                    ->additional([
                        'totalRecords' => $actualCount,
                        'enquiredCount' => $enquiredCount,
                        'waitllistCount' => $waitllistCount,
                        'emailedCount' => $emailedCount,
                        'enroledtCount' => $enroledtCount,
                        'activetCount' => $activetCount
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);

            } else {

                $dataObj = WaitListEnrollment::where('organization_id', '=', $user_organization_id);
                $dataObj = (auth()->user()->hasOwnerAccess() && $filterBranchId == '') ? $dataObj->get() : $dataObj->where('branch_id', '=', $filterBranchId)->get();

                $waitllistCount = $dataObj->whereIn('status', [0, 1])->count();
                $emailedCount = $dataObj->where('status', 1)->count();
                $enroledtCount = $dataObj->where('status', 2)->count();
                $activetCount = $dataObj->where('status', 3)->count();

                $enquiryObj = Enquiries::where('organization_id', '=', $user_organization_id)->where('status', '!=', 3)->orderBy('created_at', 'desc');
                $enquiryObj = (auth()->user()->hasOwnerAccess() && $filterBranchId == '') ? $enquiryObj : $enquiryObj->where('branch_id', '=', $filterBranchId);
                $enquiredCount = $enquiryObj->count();
                //search
                if (!is_null($searchValue)) {

                    $enquiryObj->whereLike('enquiry_info', $searchValue);
                }

                if (isset($filters->age)) {
                    $data = $enquiryObj;
                    $id_arr = array();

                    foreach ($data->get() as $value) {
                        $age = $value->enquiry_info['age'];

                        if ($filters->age == 0 && $age < 1) {
                            array_push($id_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->age == 1 && $age <= 2 && $age >= 1) {
                            array_push($id_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->age == 2 && $age <= 4 && $age >= 3) {
                            array_push($id_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->age == 3 && $age >= 5) {
                            array_push($id_arr, Helpers::decodeHashedID($value->index));
                        }
                    }

                    $enquiryObj = $enquiryObj->whereIn('id', $id_arr);
                }

                if (isset($filters->application_start_date) && isset($filters->application_end_date)) {
                    $enquiryObj->whereBetween('created_at', [date('Y-m-d 00:00:01', strtotime($filters->application_start_date)), date('Y-m-d 23:59:59', strtotime($filters->application_end_date))]);
                }

                if (isset($filters->days_waiting)) {
                    $data = $enquiryObj;
                    $temp_arr = array();

                    foreach ($data->get() as $value) {

                        if ($filters->days_waiting === '<=7' && $value->number_of_days <= 7) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->days_waiting === '<=14' && $value->number_of_days <= 14) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->days_waiting === '<=30' && $value->number_of_days <= 30) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->days_waiting === '<=60' && $value->number_of_days <= 60) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->days_waiting === '<=90' && $value->number_of_days <= 90) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        } elseif ($filters->days_waiting === '>90' && $value->number_of_days > 90) {
                            array_push($temp_arr, Helpers::decodeHashedID($value->index));
                        }
                    }

                    $enquiryObj = $enquiryObj->whereIn('id', $temp_arr);
                }

                $enquiryObj = $enquiryObj->orderBy('created_at', 'desc')->paginate($offset);

                return (new EnquiryResourceCollection($enquiryObj))
                    ->additional([
                        'totalRecords' => $enquiredCount,
                        'enquiredCount' => $enquiredCount,
                        'waitllistCount' => $waitllistCount,
                        'emailedCount' => $emailedCount,
                        'enroledtCount' => $enroledtCount,
                        'activetCount' => $activetCount
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            }


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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendEnrollmentLink(Request $request)
    {

        try {

            $data = WaitListEnrollment::find(Helpers::decodeHashedID($request->input('id')));
            $id = $request->input('id');

            $branch = Branch::where('organization_id', '=', $data->organization_id)->where('id', '=', $data->branch_id)->get()->first();
            DB::beginTransaction();

            $data->status = '1';
            $data->save();

            DB::commit();

            /*------------- Send Mail --------------*/

//                PathHelper::getEnrollmentLink($request->fullUrl(), $id, $branch_name->subdomain_name, $branch_name->kinderconnect)
            $data->notify(new SendEnrollmentForm(
                $branch->name,
                \ImageHelper::getBranchImagePath($branch->branch_logo),
                PathHelper::getEnrollmentLink($request->fullUrl(), $id, $branch->subdomain_name, true)
            ));

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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEnrollmentData(Request $request)
    {
        try {

            $enrollinfo = $request->input('form') == 'enquiry' ? Enquiries::find(Helpers::decodeHashedID($request->input('id'))) : WaitListEnrollment::find(Helpers::decodeHashedID($request->input('id')));

            if (is_null($enrollinfo)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $request->input('form') == 'enquiry' ? new EnquiryResource($enrollinfo) : new WaitlistResource($enrollinfo)
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function enrollChild(Request $request)
    {
        DB::beginTransaction();
        try {
            $enrollinfo = ($request->get('waitlist_id') != '') ? WaitListEnrollment::find(Helpers::decodeHashedID($request->get('waitlist_id'))) : '';

            /* validator*/

            $email = strtolower($request->input('parent_email'));
            $parent_mobile = $request->input('parent_mobile');
            $emergencyContatcts = $request->input('emergency');
            $carer_mobile = $request->input('carer_mobile');

            $emergencyPhone = array();
            foreach ($emergencyContatcts as $emergencyContact) {
                /* catch emergency contact with parent mobile number*/
                if ($emergencyContact['emenrgencyPhone'] == $parent_mobile) {
                    return $this->sameMobileUse();
                }

                /* duplicated emergency contact*/
                if (!in_array($emergencyContact['emenrgencyPhone'], $emergencyPhone)) {
                    array_push($emergencyPhone, $emergencyContact['emenrgencyPhone']);
                } else {
                    return $this->sameMobileUse();
                }
            }

            if ($carer_mobile != '' && $parent_mobile == $carer_mobile) {
                return $this->sameMobileUse();
            }

            if ($request->input('carer_email') !== '' && strtolower($request->input('parent_email')) == strtolower($request->input('carer_email'))) {
                return $this->sameEmailUse();
            }
            /* end validator*/


            $child_bornOrNot = ($enrollinfo != '') ? $enrollinfo->waitlist_info['child_bornOrNot'] : 0;
//            $special_note = $request->get('special_note');
            $child_firstname = $request->get('child_first_name');
            $child_middlename = $request->get('child_middle_name');
            $child_lastname = $request->get('child_last_name');
            $child_gender = $request->get('child_gender');
            $sibilings = $request->get('sibilings');
            $number_of_sibilings = $enrollinfo->waitlist_info['number_of_sibilings'];
            $chil_crn = $request->get('child_crn');
            $child_date_of_birth = $request->get('child_dob');
            $child_address = $request->get('child_address');
            $child_state = $request->get('child_state');
            $child_suburb = $request->get('child_suburb');
            $child_postcode = $request->get('child_postcode');
            $child_courtorders = $request->get('courtorders_chk');
            $enrolment_date = $request->get('child_enrolment_date');
            // $child_enrollment_start_date = $request->input('child_enrollment_start_date');
            $priority = ($enrollinfo != '') ? $enrollinfo->waitlist_info['priority'] : '';
            $parent_firstname = $request->input('parent_first_name');
            $parent_middlename = $request->input('parent_middle_name');
            $parent_lastname = $request->input('parent_last_name');
            $parent_dob = $request->input('parent_dob');
            $parent_crn = $request->input('parent_crn');
            $parent_address = $request->input('parent_address');
            $parent_suburb = $request->input('parent_suburb');
            $parent_country = $request->input('parent_country');
            $parent_postalCode = $request->input('parent_postalCode');
            $parent_state = $request->input('parent_state');
            $parent_phone = $request->input('parent_phone');
            $hearAbout = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAbout'] : '';
            $hearAboutOther = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAboutOther'] : '';

            $child_circumstances = $request->input('child_circumstances');
            $child_aboriginal = $request->input('child_aboriginal');
            $cultural_background = $request->input('cultural_background');
            $spoken_language = $request->input('spoken_language');
            $cultural_requirement_chk = $request->input('cultural_requirement_chk');
            $cultural_requirement = $request->input('cultural_requirement');
            $religious_requirements_chk = $request->input('religious_requirements_chk');
            $religious_requirements = $request->input('religious_requirements');
            // $expected_start_date = $request->input('expected_start_date');
            $bookings = $request->input('bookings');
            $child_medical_number = $request->input('child_medical_number');
            $child_medicalexpiry_date = $request->input('child_medicalexpiry_date');
            $ambulance_cover_no = $request->input('ambulance_cover_no');
            $child_heallth_center = $request->input('child_heallth_center');
            $practitioner_name = $request->input('practitioner_name');
            $practitioner_address = $request->input('practitioner_address');
            $practitioner_phoneNo = $request->input('practitioner_phoneNo');
            $health_record_chk = $request->input('health_record_chk');
            $immunised_chk = $request->input('immunised_chk');
            $prescribed_medicine_chk = $request->input('prescribed_medicine_chk');
            $allergies = $request->input('allergiesArray');
            $anaphylaxis_chk = $request->input('anaphylaxis_chk');
            $birth_certificate = $request->input('birth_certificate');
            $asthma_chk = $request->input('asthma_chk');
            $other_health_conditions_chk = $request->input('other_health_conditions_chk');
            $epipen_chk = $request->input('epipen_chk');
            //parent new details
            $relationship = $request->input('relationship');
            $work_address = $request->input('work_address');
            $work_phone = $request->input('work_phone');
            $parentWorkMob = $request->input('parentWorkMob');
            $work_email = strtolower($request->input('work_email'));
            $occupation = $request->input('occupation');
            $consent_incursion = $request->input('consent_incursion');
            $consent_make_medical_decision = $request->input('consent_make_medical_decision');
            $consent_emergency_contact = $request->input('consent_emergency_contact');
            $consent_collect_child = $request->input('consent_collect_child');
            $addition_carer_crn = $request->input('addition_carer_crn');
            $parent_spoken_language = $request->input('parent_spoken_language');
            $parent_cultural_background = $request->input('parent_cultural_background');
            $parent_aboriginal = $request->input('parent_aboriginal');
            // carer details
            $carer_relationship = $request->input('carer_relationship');
            $carer_firstname = $request->input('carer_firstname');
            $carer_middlename = $request->input('carer_middlename');
            $carer_lastname = $request->input('carer_lastname');
            $carer_dob = $request->input('carer_dob');
            $carer_email = strtolower($request->input('carer_email'));
            $carer_address = $request->input('carer_address');
            $carer_suburb = $request->input('carer_suburb');
            $carer_country = $request->input('carer_country');
            $carer_postalCode = $request->input('carer_postalCode');
            $carer_state = $request->input('carer_state');
            $carer_phone = $request->input('carer_phone');
            $carer_work_address = $request->input('carer_work_address');
            $carer_work_phone = $request->input('carer_work_phone');
            $carer_work_mob = $request->input('carer_work_mob');
            $carer_work_email = strtolower($request->input('carer_work_email'));
            $carer_occupation = $request->input('carer_occupation');
            $carer_consent_incursion = $request->input('carer_consent_incursion');
            $carer_consent_make_medical_decision = $request->input('care_consent_mak_medi_deci');
            $carer_consent_emergency_contact = $request->input('care_consent_eme_contact');
            $carer_consent_collect_child = $request->input('carer_consent_collect_child');
            $carer_spoken_language = $request->input('carer_spoken_language');
            $carer_cultural_background = $request->input('carer_cultural_background');
            $carer_aboriginal = $request->input('carer_aboriginal');
            // emergency contact details
            $nappyChange = $request->input('nappyChange');
            $bottleFeed = $request->input('bottleFeed');

            //additional consents
            $consent1 = $request->input('consent1');
            $consent2 = $request->input('consent2');
            $consent3 = $request->input('consent3');
            $consent4 = $request->input('consent4');
            $consent5 = $request->input('consent5');
            $consent6 = $request->input('consent6');
            $consent7 = $request->input('consent7');
            $consent8 = $request->input('consent8');

            /*siblings count recheck for parent email when update enrollment*/
            /* number of siblings get */
            $user = User::where('email', $email)->get()->first();
            $number_of_sibilings = ($user) ? $user->child()->count() : 0;
//            $sibilings = (int)$number_of_sibilings > 0;

            $upload_files = $request->input('upload_files');

            /*new inputs values change with values updatation on edit view*/
            $receilvedNewInputs = $request->input('updatedAllInputs');

//            $inputsForNewSections = (isset($enrollinfo->waitlist_info['section_inputs']) && $enrollinfo->waitlist_info['section_inputs'] != '') ? $enrollinfo->waitlist_info['section_inputs'] : null;
//            $newInputs = $enrollinfo->waitlist_info['new_inputs'];
//
//            if (is_null($inputsForNewSections)) {
            $latestData = WaitlistHelper::codeForOlderWaitlistInfoGenarate($enrollinfo->waitlist_info, $enrollinfo->organization_id, $enrollinfo->branch_id, 2, false);
            $inputsForNewSections = $latestData['section_inputs'];
            $newInputs = $latestData['new_inputs'];
//            }

            $waitlistInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return $k['waitlist_section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            $enrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            foreach ($receilvedNewInputs as $key => $receilvedNewInput) {

                /* enrolments for inputs for values update*/
                $key = array_search($receilvedNewInput['name'], array_column($enrolmentInputsOnly, 'name'));

                if (is_numeric($key)) {
                    $value = $receilvedNewInput['values'];
                    if ($enrolmentInputsOnly[$key]['input_type'] == 'date-picker') {
                        $value = ($receilvedNewInput['values'] != '') ? date('Y-m-d', strtotime($receilvedNewInput['values'])) : '';
                    }
                    $enrolmentInputsOnly[$key]['values'] = $value;
                }
            }
            $newInputs = array_merge($waitlistInputsOnly, $enrolmentInputsOnly);

            /* enrollemt data */
//            $elementSettings = (isset($enrollinfo->waitlist_info['element_settings']) && $enrollinfo->waitlist_info['element_settings'] != '') ? $enrollinfo->waitlist_info['element_settings'] : '';


            /* -----------------END extra details for enrollment form submit */
            $waitListObj = [
//                'special_note' => ($special_note != '') ? $special_note : '',
                'child_bornOrNot' => ($child_bornOrNot != '') ? $child_bornOrNot : 0,
                'child_firstname' => ($child_firstname != '') ? $child_firstname : '',
                'child_middlename' => ($child_middlename != '') ? $child_middlename : '',
                'child_lastname' => ($child_lastname != '') ? $child_lastname : '',
                'child_gender' => $child_gender,
                'sibilings' => $sibilings,
                'number_of_sibilings' => $number_of_sibilings,
                'chil_crn' => ($chil_crn != '') ? $chil_crn : '',
                'priority' => ($priority != '') ? $priority : '',
                'child_date_of_birth' => ($child_date_of_birth != '') ? $child_date_of_birth : '',
                'enrollment_start_date' => ($enrolment_date != '') ? $enrolment_date : '',
                'attendance' => ($enrollinfo != '') ? $enrollinfo->waitlist_info['attendance'] : '',
                'child_address' => ($child_address != '') ? $child_address : '',
                'child_state' => ($child_state != '') ? $child_state : '',
                'child_suburb' => ($child_suburb != '') ? $child_suburb : '',
                'child_postcode' => ($child_postcode != '') ? $child_postcode : '',
                'child_courtorders' => ($child_courtorders != '') ? $child_courtorders : 0,
                'parent_firstname' => ($parent_firstname != '') ? $parent_firstname : '',
                'parent_middlename' => ($parent_middlename != '') ? $parent_middlename : '',
                'parent_lastname' => ($parent_lastname != '') ? $parent_lastname : '',
                'parent_dob' => ($parent_dob != '') ? $parent_dob : '',
                'email' => ($email != '') ? $email : '',
                'parent_crn' => ($parent_crn != '') ? $parent_crn : '',
                'parent_address' => ($parent_address != '') ? $parent_address : '',
                'parent_country' => ($parent_country != '') ? $parent_country : '',
                'parent_suburb' => ($parent_suburb != '') ? $parent_suburb : '',
                'parent_postalCode' => ($parent_postalCode != '') ? $parent_postalCode : '',
                'parent_state' => ($parent_state != '') ? $parent_state : '',
                'parent_phone' => ($parent_phone != '') ? $parent_phone : '',
                'parent_mobile' => ($parent_mobile != '') ? $parent_mobile : '',
                'hearAbout' => ($hearAbout != '') ? $hearAbout : '',
                'hearAboutOther' => ($hearAboutOther != '') ? $hearAboutOther : '',

                /*------------------- extra details for enrollment form submit */
                'child_circumstances' => ($child_circumstances != '') ? $child_circumstances : '',
                'child_aboriginal' => ($child_aboriginal != '') ? $child_aboriginal : '',
                'cultural_background' => ($cultural_background != '') ? $cultural_background : '',
                'spoken_language' => ($spoken_language != '') ? $spoken_language : '',
                'cultural_requirement_chk' => ($cultural_requirement_chk != '') ? 1 : 0,
                'cultural_requirement' => ($cultural_requirement != '') ? $cultural_requirement : '',
                'religious_requirements_chk' => ($religious_requirements_chk != '') ? 1 : 0,
                'religious_requirements' => ($religious_requirements != '') ? $religious_requirements : '',
                // 'expected_start_date' => ($expected_start_date != '') ? $expected_start_date : '',
                'bookings' => ($bookings != '') ? $bookings : '',
                'child_medical_number' => ($child_medical_number != '') ? $child_medical_number : '',
                'child_medicalexpiry_date' => ($child_medicalexpiry_date != '') ? $child_medicalexpiry_date : '',
                'ambulance_cover_no' => ($ambulance_cover_no != '') ? $ambulance_cover_no : '',
                'child_heallth_center' => ($child_heallth_center != '') ? $child_heallth_center : '',
                'practitioner_name' => ($practitioner_name != '') ? $practitioner_name : '',
                'practitioner_address' => ($practitioner_address != '') ? $practitioner_address : '',
                'practitioner_phoneNo' => ($practitioner_phoneNo != '') ? $practitioner_phoneNo : '',
                'health_record_chk' => ($health_record_chk != '') ? 1 : 0,
                'immunised_chk' => ($immunised_chk != '') ? 1 : 0,
                'prescribed_medicine_chk' => ($prescribed_medicine_chk != '') ? 1 : 0,
                'allergiesArray' => ($allergies != '') ? $allergies : '',
                'anaphylaxis_chk' => ($anaphylaxis_chk != '') ? 1 : 0,
                'birth_certificate' => ($birth_certificate != '') ? 1 : 0,
                'asthma_chk' => ($asthma_chk != '') ? 1 : 0,
                'other_health_conditions_chk' => ($other_health_conditions_chk != '') ? 1 : 0,
                'epipen_chk' => ($epipen_chk != '') ? 1 : 0,
                //parent new details
                'relationship' => ($relationship != '') ? $relationship : '',
                'work_address' => ($work_address != '') ? $work_address : '',
                'work_phone' => ($work_phone != '') ? $work_phone : '',
                'parentWorkMob' => ($parentWorkMob != '') ? $parentWorkMob : '',
                'work_email' => ($work_email != '') ? $work_email : '',
                'occupation' => ($occupation != '') ? $occupation : '',
                'consent_incursion' => $consent_incursion,
                'consent_make_medical_decision' => $consent_make_medical_decision,
                'consent_emergency_contact' => $consent_emergency_contact,
                'consent_collect_child' => $consent_collect_child,
                'addition_carer_crn' => ($addition_carer_crn != '') ? $addition_carer_crn : '',
                'parent_spoken_language' => ($parent_spoken_language != '') ? $parent_spoken_language : '',
                'parent_cultural_background' => ($parent_cultural_background != '') ? $parent_cultural_background : '',
                'parent_aboriginal' => ($parent_aboriginal != '') ? $parent_aboriginal : '',
                // carer details
                'carer_relationship' => ($carer_relationship != '') ? $carer_relationship : '',
                'carer_firstname' => ($carer_firstname != '') ? $carer_firstname : '',
                'carer_middlename' => ($carer_middlename != '') ? $carer_middlename : '',
                'carer_lastname' => ($carer_lastname != '') ? $carer_lastname : '',
                'carer_dob' => ($carer_dob != '') ? $carer_dob : '',
                'carer_email' => ($carer_email != '') ? $carer_email : '',
                'carer_address' => ($carer_address != '') ? $carer_address : '',
                'carer_suburb' => ($carer_suburb != '') ? $carer_suburb : '',
                'carer_country' => ($carer_country != '') ? $carer_country : '',
                'carer_postalCode' => ($carer_postalCode != '') ? $carer_postalCode : '',
                'carer_state' => ($carer_state != '') ? $carer_state : '',
                'carer_phone' => ($carer_phone != '') ? $carer_phone : '',
                'carer_mobile' => ($carer_mobile != '') ? $carer_mobile : '',
                'carer_work_address' => ($carer_work_address != '') ? $carer_work_address : '',
                'carer_work_phone' => ($carer_work_phone != '') ? $carer_work_phone : '',
                'carer_work_mob' => ($carer_work_mob != '') ? $carer_work_mob : '',
                'carer_work_email' => ($carer_work_email != '') ? $carer_work_email : '',
                'carer_occupation' => ($carer_occupation != '') ? $carer_occupation : '',
                'carer_consent_incursion' => $carer_consent_incursion,
                'care_consent_mak_medi_deci' => $carer_consent_make_medical_decision,
                'care_consent_eme_contact' => $carer_consent_emergency_contact,
                'carer_consent_collect_child' => $carer_consent_collect_child,
                'carer_spoken_language' => ($carer_spoken_language != '') ? $carer_spoken_language : '',
                'carer_cultural_background' => ($carer_cultural_background != '') ? $carer_cultural_background : '',
                'carer_aboriginal' => ($carer_aboriginal != '') ? $carer_aboriginal : '',
                // emergency contact details
                'emergencyContacts' => ($emergencyContatcts != '') ? $emergencyContatcts : '',
                // emergencyContatcts
                //additional consents
                'consent1' => ($consent1 != '') ? $consent1 : 0,
                'consent2' => ($consent2 != '') ? $consent2 : 0,
                'consent3' => ($consent3 != '') ? $consent3 : 0,
                'consent4' => ($consent4 != '') ? $consent4 : 0,
                'consent5' => ($consent5 != '') ? $consent5 : 0,
                'consent6' => ($consent6 != '') ? $consent6 : 0,
                'consent7' => ($consent7 != '') ? $consent7 : 0,
                'consent8' => ($consent8 != '') ? $consent8 : 0,
                'bottleFeed' => ($bottleFeed != '') ? $bottleFeed : 0,
                'nappyChange' => ($nappyChange != '') ? $nappyChange : 0,
                'new_inputs' => $newInputs,
//                'element_settings' => ($elementSettings != '') ? $elementSettings : '',
                'upload_files' => $upload_files,
                'section_inputs' => $inputsForNewSections,
                /* -----------------END extra details for enrollment form submit */
            ];

            if ($enrollinfo == '') {
                $enrollinfo = new WaitListEnrollment();
                $enrollinfo->waitlist_info = $waitListObj;
                $enrollinfo->status = '2';
                $enrollinfo->organization_id = $enrollinfo->organization_id;
                $enrollinfo->branch_id = $enrollinfo->branch_id;
            } else {
                $enrollinfo->waitlist_info = $waitListObj;
                $enrollinfo->status = '2';
            }

            $enrollinfo->save();

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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateEnrolment(Request $request): \Illuminate\Http\JsonResponse
    {
        DB::beginTransaction();
        try {
            // $id = ($request->input('waitlist_id') != '') ? $request->input('waitlist_id') : '';
            $enrollinfo = WaitListEnrollment::find(Helpers::decodeHashedID($request->input('waitlist_id')));

            if ($enrollinfo == null) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_500,
                        LocalizationHelper::getTranslatedText('system.internal_error')
                    ),
                    RequestType::CODE_500
                );
            }

            /* validator*/

            $email = strtolower($request->input('parent_email'));
            $parent_mobile = $request->input('parent_mobile');
            $emergencyContatcts = $request->input('emergency');
            $carer_mobile = $request->input('carer_mobile');

            $emergencyPhone = array();
            foreach ($emergencyContatcts as $emergencyContact) {
                /* catch emergency contact with parent mobile number*/
                if ($emergencyContact['emenrgencyPhone'] == $parent_mobile) {
                    return $this->sameMobileUse();
                }

                /* duplicated emergency contact*/
                if (!in_array($emergencyContact['emenrgencyPhone'], $emergencyPhone)) {
                    array_push($emergencyPhone, $emergencyContact['emenrgencyPhone']);
                } else {
                    return $this->sameMobileUse();
                }
            }

            if ($carer_mobile != '' && $parent_mobile == $carer_mobile) {
                return $this->sameMobileUse();
            }

            if ($request->input('carer_email') !== '' && strtolower($request->input('parent_email')) == strtolower($request->input('carer_email'))) {
                return $this->sameEmailUse();
            }
            /* end validator*/

            if ($request->input('carer_email') !== '' && strtolower($request->input('parent_email') == strtolower($request->input('carer_email')))) {
                return $this->sameEmailUse();
            }

            $child_bornOrNot = ($enrollinfo != '') ? $enrollinfo->waitlist_info['child_bornOrNot'] : 0;
//            $special_note = $request->input('special_note');
            $child_firstname = $request->input('child_first_name');
            $child_middlename = $request->input('child_middle_name');
            $child_lastname = $request->input('child_last_name');
            $child_gender = $request->input('child_gender');
            $sibilings = $request->input('sibilings');
            $number_of_sibilings = $enrollinfo->waitlist_info['number_of_sibilings'];
            $chil_crn = $request->input('child_crn');
            $child_date_of_birth = $request->input('child_dob');
            $child_address = $request->input('child_address');
            $child_state = $request->input('child_state');
            $child_suburb = $request->input('child_suburb');
            $child_postcode = $request->input('child_postcode');
            $child_courtorders = $request->input('courtorders_chk');
            $enrolment_date = $request->input('child_enrolment_date');
            // $child_enrollment_start_date = $request->input('child_enrollment_start_date');
            $priority = ($enrollinfo != '') ? $enrollinfo->waitlist_info['priority'] : '';
            $parent_firstname = $request->input('parent_first_name');
            $parent_middlename = $request->input('parent_middle_name');
            $parent_lastname = $request->input('parent_last_name');
            $parent_dob = $request->input('parent_dob');
            $parent_crn = $request->input('parent_crn');
            $parent_address = $request->input('parent_address');
            $parent_suburb = $request->input('parent_suburb');
            $parent_country = $request->input('parent_country');
            $parent_postalCode = $request->input('parent_postalCode');
            $parent_state = $request->input('parent_state');
            $parent_phone = $request->input('parent_phone');
            $hearAbout = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAbout'] : '';
            $hearAboutOther = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAboutOther'] : '';

            $child_circumstances = $request->input('child_circumstances');
            $child_aboriginal = $request->input('child_aboriginal');
            $cultural_background = $request->input('cultural_background');
            $spoken_language = $request->input('spoken_language');
            $cultural_requirement_chk = $request->input('cultural_requirement_chk');
            $cultural_requirement = $request->input('cultural_requirement');
            $religious_requirements_chk = $request->input('religious_requirements_chk');
            $religious_requirements = $request->input('religious_requirements');
            // $expected_start_date = $request->input('expected_start_date');
            $bookings = $request->input('bookings');
            $child_medical_number = $request->input('child_medical_number');
            $child_medicalexpiry_date = $request->input('child_medicalexpiry_date');
            $ambulance_cover_no = $request->input('ambulance_cover_no');
            $child_heallth_center = $request->input('child_heallth_center');
            $practitioner_name = $request->input('practitioner_name');
            $practitioner_address = $request->input('practitioner_address');
            $practitioner_phoneNo = $request->input('practitioner_phoneNo');
            $health_record_chk = $request->input('health_record_chk');
            $immunised_chk = $request->input('immunised_chk');
            $prescribed_medicine_chk = $request->input('prescribed_medicine_chk');
            $allergies = $request->input('allergiesArray');
            $anaphylaxis_chk = $request->input('anaphylaxis_chk');
            $birth_certificate = $request->input('birth_certificate');
            $asthma_chk = $request->input('asthma_chk');
            $other_health_conditions_chk = $request->input('other_health_conditions_chk');
            $epipen_chk = $request->input('epipen_chk');
            //parent new details
            $relationship = $request->input('relationship');
            $work_address = $request->input('work_address');
            $work_phone = $request->input('work_phone');
            $parentWorkMob = $request->input('parentWorkMob');
            $work_email = strtolower($request->input('work_email'));
            $occupation = $request->input('occupation');
            $consent_incursion = $request->input('consent_incursion');
            $consent_make_medical_decision = $request->input('consent_make_medical_decision');
            $consent_emergency_contact = $request->input('consent_emergency_contact');
            $consent_collect_child = $request->input('consent_collect_child');
            $addition_carer_crn = $request->input('addition_carer_crn');
            $parent_spoken_language = $request->input('parent_spoken_language');
            $parent_cultural_background = $request->input('parent_cultural_background');
            $parent_aboriginal = $request->input('parent_aboriginal');
            // carer details
            $carer_relationship = $request->input('carer_relationship');
            $carer_firstname = $request->input('carer_firstname');
            $carer_middlename = $request->input('carer_middlename');
            $carer_lastname = $request->input('carer_lastname');
            $carer_dob = $request->input('carer_dob');
            $carer_email = strtolower($request->input('carer_email'));
            $carer_address = $request->input('carer_address');
            $carer_suburb = $request->input('carer_suburb');
            $carer_country = $request->input('carer_country');
            $carer_postalCode = $request->input('carer_postalCode');
            $carer_state = $request->input('carer_state');
            $carer_phone = $request->input('carer_phone');
            $carer_work_address = $request->input('carer_work_address');
            $carer_work_phone = $request->input('carer_work_phone');
            $carer_work_mob = $request->input('carer_work_mob');
            $carer_work_email = strtolower($request->input('carer_work_email'));
            $carer_occupation = $request->input('carer_occupation');
            $carer_consent_incursion = $request->input('carer_consent_incursion');
            $carer_consent_make_medical_decision = $request->input('care_consent_mak_medi_deci');
            $carer_consent_emergency_contact = $request->input('care_consent_eme_contact');
            $carer_consent_collect_child = $request->input('carer_consent_collect_child');
            $carer_spoken_language = $request->input('carer_spoken_language');
            $carer_cultural_background = $request->input('carer_cultural_background');
            $carer_aboriginal = $request->input('carer_aboriginal');
            // emergency contact details
            $nappyChange = $request->input('nappyChange');
            $bottleFeed = $request->input('bottleFeed');
            //additional consents
            $consent1 = $request->input('consent1');
            $consent2 = $request->input('consent2');
            $consent3 = $request->input('consent3');
            $consent4 = $request->input('consent4');
            $consent5 = $request->input('consent5');
            $consent6 = $request->input('consent6');
            $consent7 = $request->input('consent7');
            $consent8 = $request->input('consent8');

            $upload_files = $request->input('upload_files');

            /*new inputs values change with values updatation on edit view*/
            $receilvedNewInputs = $request->input('updatedAllInputs');

            $section_inputs = (isset($enrollinfo->waitlist_info['section_inputs']) && $enrollinfo->waitlist_info['section_inputs'] != '') ? $enrollinfo->waitlist_info['section_inputs'] : null;
            $newInputs = $enrollinfo->waitlist_info['new_inputs'];

            if (is_null($section_inputs)) {
                $missedData = WaitlistHelper::codeForOlderWaitlistInfoGenarate($enrollinfo->waitlist_info, $enrollinfo->organization_id, $enrollinfo->branch_id, $enrollinfo->status, true);
                $section_inputs = $missedData['section_inputs'];
                $newInputs = $missedData['new_inputs'];
//                $emergencyContatcts = $missedData['emergencyContacts'];
            }

            $enrolmentInputsOnly = array_values(array_filter($newInputs, function ($k) {
                return $k['section'] !== '';
            }, ARRAY_FILTER_USE_BOTH));

            foreach ($receilvedNewInputs as $key => $receilvedNewInput) {

                /* enrolments for inputs for values update*/
                $key = array_search($receilvedNewInput['name'], array_column($enrolmentInputsOnly, 'name'));

                if (is_numeric($key)) {
                    $value = $receilvedNewInput['values'];
                    if ($enrolmentInputsOnly[$key]['input_type'] == 'date-picker') {
                        $value = ($receilvedNewInput['values'] != '') ? date('Y-m-d', strtotime($receilvedNewInput['values'])) : '';
                    }
                    $enrolmentInputsOnly[$key]['values'] = $value;
                }
            }
            $newInputs = $enrolmentInputsOnly;

            /* enrollemt settings data */
//            $elementSettings = (isset($enrollinfo->waitlist_info['element_settings']) && $enrollinfo->waitlist_info['element_settings'] != '') ? $enrollinfo->waitlist_info['element_settings'] : '';

            /*siblings count recheck for parent email when update enrollment*/
            /* number of siblings get */
            $user = User::where('email', $email)->get()->first();
            $number_of_sibilings = ($user) ? $user->child()->count() : 0;
//            $sibilings = (int)$number_of_sibilings > 0;

            /* -----------------END extra details for enrollment form submit */
            $waitListObj = [
//                'special_note' => ($special_note != '') ? $special_note : '',
                'child_bornOrNot' => ($child_bornOrNot != '') ? $child_bornOrNot : 0,
                'child_firstname' => ($child_firstname != '') ? $child_firstname : '',
                'child_middlename' => ($child_middlename != '') ? $child_middlename : '',
                'child_lastname' => ($child_lastname != '') ? $child_lastname : '',
                'child_gender' => $child_gender,
                'sibilings' => $sibilings,
                'number_of_sibilings' => $number_of_sibilings,
                'chil_crn' => ($chil_crn != '') ? $chil_crn : '',
                'priority' => ($priority != '') ? $priority : '',
                'child_date_of_birth' => ($child_date_of_birth != '') ? $child_date_of_birth : '',
                'enrollment_start_date' => ($enrolment_date != '') ? $enrolment_date : '',
                'attendance' => ($enrollinfo != '') ? $enrollinfo->waitlist_info['attendance'] : '',
                'child_address' => ($child_address != '') ? $child_address : '',
                'child_state' => ($child_state != '') ? $child_state : '',
                'child_suburb' => ($child_suburb != '') ? $child_suburb : '',
                'child_postcode' => ($child_postcode != '') ? $child_postcode : '',
                'parent_firstname' => ($parent_firstname != '') ? $parent_firstname : '',
                'parent_middlename' => ($parent_middlename != '') ? $parent_middlename : '',
                'parent_lastname' => ($parent_lastname != '') ? $parent_lastname : '',
                'parent_dob' => ($parent_dob != '') ? $parent_dob : '',
                'email' => ($email != '') ? $email : '',
                'parent_crn' => ($parent_crn != '') ? $parent_crn : '',
                'parent_address' => ($parent_address != '') ? $parent_address : '',
                'parent_country' => ($parent_country != '') ? $parent_country : '',
                'parent_suburb' => ($parent_suburb != '') ? $parent_suburb : '',
                'parent_postalCode' => ($parent_postalCode != '') ? $parent_postalCode : '',
                'parent_state' => ($parent_state != '') ? $parent_state : '',
                'child_courtorders' => ($child_courtorders != '') ? $child_courtorders : 0,
                'parent_phone' => ($parent_phone != '') ? $parent_phone : '',
                'parent_mobile' => ($parent_mobile != '') ? $parent_mobile : '',
                'hearAbout' => ($hearAbout != '') ? $hearAbout : '',
                'hearAboutOther' => ($hearAboutOther != '') ? $hearAboutOther : '',

                /*------------------- extra details for enrollment form submit */
                'child_circumstances' => ($child_circumstances != '') ? $child_circumstances : '',
                'child_aboriginal' => ($child_aboriginal != '') ? $child_aboriginal : '',
                'cultural_background' => ($cultural_background != '') ? $cultural_background : '',
                'spoken_language' => ($spoken_language != '') ? $spoken_language : '',
                'cultural_requirement_chk' => ($cultural_requirement_chk != '') ? 1 : 0,
                'cultural_requirement' => ($cultural_requirement != '') ? $cultural_requirement : '',
                'religious_requirements_chk' => ($religious_requirements_chk != '') ? 1 : 0,
                'religious_requirements' => ($religious_requirements != '') ? $religious_requirements : '',
                // 'expected_start_date' => ($expected_start_date != '') ? $expected_start_date : '',
                'bookings' => ($bookings != '') ? $bookings : '',
                'child_medical_number' => ($child_medical_number != '') ? $child_medical_number : '',
                'child_medicalexpiry_date' => ($child_medicalexpiry_date != '') ? $child_medicalexpiry_date : '',
                'ambulance_cover_no' => ($ambulance_cover_no != '') ? $ambulance_cover_no : '',
                'child_heallth_center' => ($child_heallth_center != '') ? $child_heallth_center : '',
                'practitioner_name' => ($practitioner_name != '') ? $practitioner_name : '',
                'practitioner_address' => ($practitioner_address != '') ? $practitioner_address : '',
                'practitioner_phoneNo' => ($practitioner_phoneNo != '') ? $practitioner_phoneNo : '',
                'health_record_chk' => ($health_record_chk != '') ? 1 : 0,
                'immunised_chk' => ($immunised_chk != '') ? 1 : 0,
                'prescribed_medicine_chk' => ($prescribed_medicine_chk != '') ? 1 : 0,
                'allergiesArray' => ($allergies != '') ? $allergies : '',
                'anaphylaxis_chk' => ($anaphylaxis_chk != '') ? 1 : 0,
                'birth_certificate' => ($birth_certificate != '') ? 1 : 0,
                'asthma_chk' => ($asthma_chk != '') ? 1 : 0,
                'other_health_conditions_chk' => ($other_health_conditions_chk != '') ? 1 : 0,
                'epipen_chk' => ($epipen_chk != '') ? 1 : 0,
                //parent new details
                'relationship' => ($relationship != '') ? $relationship : '',
                'work_address' => ($work_address != '') ? $work_address : '',
                'work_phone' => ($work_phone != '') ? $work_phone : '',
                'parentWorkMob' => ($parentWorkMob != '') ? $parentWorkMob : '',
                'work_email' => ($work_email != '') ? $work_email : '',
                'occupation' => ($occupation != '') ? $occupation : '',
                'consent_incursion' => $consent_incursion,
                'consent_make_medical_decision' => $consent_make_medical_decision,
                'consent_emergency_contact' => $consent_emergency_contact,
                'consent_collect_child' => $consent_collect_child,
                'addition_carer_crn' => ($addition_carer_crn != '') ? $addition_carer_crn : '',
                'parent_spoken_language' => ($parent_spoken_language != '') ? $parent_spoken_language : '',
                'parent_cultural_background' => ($parent_cultural_background != '') ? $parent_cultural_background : '',
                'parent_aboriginal' => ($parent_aboriginal != '') ? $parent_aboriginal : '',
                // carer details
                'carer_relationship' => ($carer_relationship != '') ? $carer_relationship : '',
                'carer_firstname' => ($carer_firstname != '') ? $carer_firstname : '',
                'carer_middlename' => ($carer_middlename != '') ? $carer_middlename : '',
                'carer_lastname' => ($carer_lastname != '') ? $carer_lastname : '',
                'carer_dob' => ($carer_dob != '') ? $carer_dob : '',
                'carer_email' => ($carer_email != '') ? $carer_email : '',
                'carer_address' => ($carer_address != '') ? $carer_address : '',
                'carer_suburb' => ($carer_suburb != '') ? $carer_suburb : '',
                'carer_country' => ($carer_country != '') ? $carer_country : '',
                'carer_postalCode' => ($carer_postalCode != '') ? $carer_postalCode : '',
                'carer_state' => ($carer_state != '') ? $carer_state : '',
                'carer_phone' => ($carer_phone != '') ? $carer_phone : '',
                'carer_mobile' => ($carer_mobile != '') ? $carer_mobile : '',
                'carer_work_address' => ($carer_work_address != '') ? $carer_work_address : '',
                'carer_work_phone' => ($carer_work_phone != '') ? $carer_work_phone : '',
                'carer_work_mob' => ($carer_work_mob != '') ? $carer_work_mob : '',
                'carer_work_email' => ($carer_work_email != '') ? $carer_work_email : '',
                'carer_occupation' => ($carer_occupation != '') ? $carer_occupation : '',
                'carer_consent_incursion' => $carer_consent_incursion,
                'care_consent_mak_medi_deci' => $carer_consent_make_medical_decision,
                'care_consent_eme_contact' => $carer_consent_emergency_contact,
                'carer_consent_collect_child' => $carer_consent_collect_child,
                'carer_spoken_language' => ($carer_spoken_language != '') ? $carer_spoken_language : '',
                'carer_cultural_background' => ($carer_cultural_background != '') ? $carer_cultural_background : '',
                'carer_aboriginal' => ($carer_aboriginal != '') ? $carer_aboriginal : '',
                // emergency contact details
                'emergencyContacts' => ($emergencyContatcts != '') ? $emergencyContatcts : '',
                'bottleFeed' => ($bottleFeed != '') ? $bottleFeed : 0,
                'nappyChange' => ($nappyChange != '') ? $nappyChange : 0,
                // emergencyContatcts
                //additional consents
                'consent1' => ($consent1 != '') ? $consent1 : 0,
                'consent2' => ($consent2 != '') ? $consent2 : 0,
                'consent3' => ($consent3 != '') ? $consent3 : 0,
                'consent4' => ($consent4 != '') ? $consent4 : 0,
                'consent5' => ($consent5 != '') ? $consent5 : 0,
                'consent6' => ($consent6 != '') ? $consent6 : 0,
                'consent7' => ($consent7 != '') ? $consent7 : 0,
                'consent8' => ($consent8 != '') ? $consent8 : 0,
                'new_inputs' => $newInputs,
//                'element_settings' => ($elementSettings != '') ? $elementSettings : '',
                'upload_files' => $upload_files,
                'section_inputs' => $section_inputs
                /* -----------------END extra details for enrollment form submit */
            ];

            $enrollinfo->waitlist_info = $waitListObj;

            $enrollinfo->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
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

    /***
     * store child object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function createChild(Request $request)
    {
        DB::beginTransaction();

        try {
            $validator = Validator::make($request->all(), [
                'id' => ['required'],
                'room' => ['required'],
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
            $data = WaitListEnrollment::find(Helpers::decodeHashedID($request->input('id')));
            $send_ezidebit_mail = $request->input('send_ezidebit_mail') == 'true' ? true : false;


            if (Helpers::IsNullOrEmpty($data->waitlist_info['child_date_of_birth'])) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }


            // create child profile
            $childAcc = new Child();

            $childAcc->organization_id = auth()->user()->organization_id;
            $childAcc->branch_id = $data->branch_id;
            $childAcc->created_by = auth()->user()->id;

            $childAcc->first_name = $data->waitlist_info['child_firstname'];
            $childAcc->last_name = $data->waitlist_info['child_lastname'];
            $childAcc->middle_name = $data->waitlist_info['child_middlename'];
            $childAcc->ccs_id = $data->waitlist_info['chil_crn'];
            $childAcc->join_date = $data->waitlist_info['enrollment_start_date'];
            $childAcc->gender = $data->waitlist_info['child_gender'];
            $childAcc->dob = $data->waitlist_info['child_date_of_birth'];

            $childAcc->attendance = isset($data->waitlist_info['bookings']) && !empty($data->waitlist_info['bookings']) ? $this->attendancePopulate($data->waitlist_info['bookings']) : [];

            $childAcc->child_description = $data->waitlist_info['child_circumstances'];
            $childAcc->court_orders = $data->waitlist_info['child_courtorders'];
            $childAcc->home_address = $data->waitlist_info['child_address'];
            $childAcc->suburb = $data->waitlist_info['child_suburb'];
            $childAcc->state = $data->waitlist_info['child_state'];
            $childAcc->postalcode = $data->waitlist_info['child_postcode'];
            $childAcc->nappy_option_required = isset($data->waitlist_info['nappyChange']) ? $data->waitlist_info['nappyChange'] : 0;
            $childAcc->bottle_feed_option_required = isset($data->waitlist_info['bottleFeed']) ? $data->waitlist_info['bottleFeed'] : 0;
            $childAcc->status = '1';
            $childAcc->child_profile_image = isset($data->waitlist_info['upload_files']['childProImage'][0]) ? $data->waitlist_info['upload_files']['childProImage'][0] : '';
            $childAcc->save();


            $data->status = '3';
            $data->save();


            $child_reference = $childAcc->id;

            /* waitlist - enrolment notes for set respective child id */
            WaitlistEnrolmentNotes::where('enquiry_waitlist_enrolment_id', $data->id)->update(['child_id' => $childAcc->id, 'updated_at' => \DB::raw('updated_at')]);

            /* ------store booking details------*/


//            $mornings = array_values(array_filter($data->waitlist_info['bookings'], function ($k) {
//                return $k['mornings'] == 'AM';
//            }, ARRAY_FILTER_USE_BOTH));
//            $afternoon = array_values(array_filter($data->waitlist_info['bookings'], function ($k) {
//                return $k['mornings'] == 'PM';
//            }, ARRAY_FILTER_USE_BOTH));
//
//            $request->request->add([
//                'child' => Helpers::hxCode($child_reference),
//                'room' => $request->input('room'),
//                'type' => 0, // 0 - casual booking, 1 - absence, 2 - holiday, 3 - normal booking
//                'date' => $data->waitlist_info['enrollment_start_date'],
//                'morning_selected_days' => json_encode($mornings),
//                'afternoon_selected_days' => json_encode($afternoon)
//            ]);
//
//            $this->bookingRequestRepo->store($request);

//            $booking = new BookingRequest();
//
//            $booking->organization_id = auth()->user()->organization_id;
//            $booking->branch_id = $data->branch_id;
//            $booking->created_by = auth()->user()->id;
//
//            $booking->child_id = $child_reference;
//            $booking->start_date = $data->waitlist_info['enrollment_start_date'];
//            $booking->days = $data->waitlist_info['bookings'];
//
//            $booking->save();

            if (isset($data->waitlist_info['allergiesArray']) && is_array($data->waitlist_info['allergiesArray']) && count($data->waitlist_info['allergiesArray']) > 0) {
                foreach ($data->waitlist_info['allergiesArray'] as $value) {

                    if ($value['allergies'] != '') {
                        $allergy = new Allergy();

                        $allergy->child_id = $child_reference;
                        $allergy->allergy_type = Helpers::decodeHashedID($value['allergies']);
                        $allergy->description = $value['detailsOfAllergies'];

                        $allergy->save();
                    }
                }
            }


            /* ------End store booking details------*/

            /* ------store health and medical details------*/

            $medicalInfo = new HealthAndMedical();

            $medicalInfo->child_id = $child_reference;
            $medicalInfo->ref_no = $data->waitlist_info['child_medical_number'];
            $medicalInfo->medicare_expiry_date = ($data->waitlist_info['child_medicalexpiry_date'] != '') ? $data->waitlist_info['child_medicalexpiry_date'] : null;
            $medicalInfo->ambulance_cover_no = $data->waitlist_info['ambulance_cover_no'];
            $medicalInfo->health_center = $data->waitlist_info['child_heallth_center'];
            $medicalInfo->service_name = $data->waitlist_info['practitioner_name'];
            $medicalInfo->service_phone_no = $data->waitlist_info['practitioner_phoneNo'];
            $medicalInfo->service_address = $data->waitlist_info['practitioner_address'];

            $medicalInfo->save();

            /* ------End store health and medical details------*/

            /* ------store cultural details------*/

            $culturalInfo = new ChildCulturalDetails();

            $culturalInfo->child_id = $child_reference;
            $culturalInfo->ab_or_tsi = $data->waitlist_info['child_aboriginal'];
            $culturalInfo->cultural_background = $data->waitlist_info['cultural_background'];
            $culturalInfo->language = $data->waitlist_info['spoken_language'];
            $culturalInfo->cultural_requirements_chk = ($data->waitlist_info['cultural_requirement_chk'] == true) ? '1' : '0';
            $culturalInfo->cultural_requirements = ($data->waitlist_info['cultural_requirement_chk']) ? $data->waitlist_info['cultural_requirement'] : null;
            $culturalInfo->religious_requirements_chk = ($data->waitlist_info['religious_requirements_chk'] == true) ? '1' : '0';
            $culturalInfo->religious_requirements = ($data->waitlist_info['religious_requirements_chk']) ? $data->waitlist_info['religious_requirements'] : null;

            $culturalInfo->save();

            /* ------End store cultural details------*/

            $parentInfo = User::where('email', '=', strtolower($data->waitlist_info['email']))
                ->where('organization_id', '=', $data->organization_id)
                ->get()
                ->first();

            if (!$parentInfo) { /*if not - system to new*/
                $parentInfo = $this->createParent($request, $data, $childAcc);
                $this->child->setPrimaryPayer($childAcc->id, $parentInfo->id);
            } else { // for siblings
                $parentInfo = User::where('email', '=', strtolower($data->waitlist_info['email']))/* check branch for parent exists */
                ->where('organization_id', '=', $data->organization_id)
                    ->where('branch_id', '=', $data->branch_id)
                    ->get()
                    ->first();
                if (!$parentInfo) { /* in branch parent does not exists*/
                    $parentInfo = $this->createParent($request, $data, $childAcc);
                    $this->child->setPrimaryPayer($childAcc->id, $parentInfo->id);
                } else {
                    $childAcc->parents()->attach([$parentInfo->id => ['primary_contact' => false, 'primary_payer' => true]]);
                    if ($parentInfo->isEmergencyContact() && $parentInfo->isNotAParent()) {
                        $role = Role::where('name', '=', 'parent')->where('organization_id', '=', $data->organization_id)->get()->first();
                        $parentInfo->assignRole($role->id);

                        // send sns if branch is connected to current gen (kinder connect)
                        if ($parentInfo->branch->kinderconnect) {
                            $this->snsService->publishEvent(
                                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                                [
                                    'organization' => $parentInfo->organization_id,
                                    'branch' => $parentInfo->branch_id,
                                    'subjectid' => $parentInfo->id,
                                    'role' => $parentInfo->getRoleTypeForKinderConnect(),
                                    'action' => 'guardianconvert'
                                ],
                                CurrentGenConnectType::USER_SUBJECT
                            );
                        }
                    }
                }
            }

            if ($send_ezidebit_mail && $parentInfo) {

                $this->emailEzidebitForm($parentInfo->id);

            }

            /* consents store*/
            $this->childConsentsStore($child_reference, $data, $parentInfo->id);

            /* ------ Store Documents --------------*/

            $childDocuments = new ChildDocuments();
            $childDocuments->child_id = $child_reference;
            $childDocuments->created_by = $parentInfo->id;
            $childDocuments->documents = isset($data->waitlist_info['upload_files']) ? $data->waitlist_info['upload_files'] : [];
            $childDocuments->save();
            /* --------- End Store Documents -------*/

            /* set as primary payer in by default */
            //$this->child->setPrimaryPayer($childAcc->id, $parentInfo->id);

            if (
                $data->waitlist_info['relationship'] ||
                $data->waitlist_info['consent_emergency_contact'] ||
                $data->waitlist_info['consent_collect_child'] ||
                $data->waitlist_info['consent_make_medical_decision'] ||
                $data->waitlist_info['consent_incursion']) {

                //Create emergency contact and link with parent

                $request['email'] = ($data->waitlist_info['email'] != '') ? strtolower($data->waitlist_info['email']) : 'noreply@kinderm8.com.au';
                $request['firstname'] = $data->waitlist_info['parent_firstname'];
                $request['lastname'] = $data->waitlist_info['parent_lastname'];
                $request['phone'] = $data->waitlist_info['parent_mobile'];
                $request['phone2'] = $data->waitlist_info['parent_phone'];
                $request['address1'] = $data->waitlist_info['parent_address'];

                $request['consentEmergencyContact'] = $data->waitlist_info['consent_emergency_contact'];
                $request['consentCollectChild'] = $data->waitlist_info['consent_collect_child'];
                $request['consentMakeMedicalDecision'] = $data->waitlist_info['consent_make_medical_decision'];
                $request['consentIncursion'] = $data->waitlist_info['consent_incursion'];
                $request['relationship'] = $data->waitlist_info['relationship'];

                $this->child->setEmergencyContact($childAcc->id, $parentInfo->id, $request);

                $this->clearRequest($request);

            }

            if ($data->waitlist_info['carer_email'] &&
                $data->waitlist_info['carer_firstname'] &&
                $data->waitlist_info['carer_lastname']
            ) {

                $additionalCarer = User::where('email', '=', strtolower($data->waitlist_info['carer_email']))
                    ->where('organization_id', '=', $data->organization_id)
                    ->get()
                    ->first();

                if (!$additionalCarer) {
                    $additionalCarer = $this->createAdditionalCarer($request, $data, $childAcc);
                } else {
                    $additionalCarer = User::where('email', '=', strtolower($data->waitlist_info['carer_email']))/* check branch for carer exists */
                    ->where('organization_id', '=', $data->organization_id)
                        ->where('branch_id', '=', $data->branch_id)
                        ->get()
                        ->first();
                    if (!$additionalCarer) { /* in branch parent does not exists*/
                        $additionalCarer = $this->createAdditionalCarer($request, $data, $childAcc);
                    } else {
                        if (strtolower($data->waitlist_info['carer_email']) !== strtolower($data->waitlist_info['email'])) {
                            $childAcc->parents()->attach($additionalCarer->id);
                        } else {
                            return $this->sameEmailUse();
                        }
                    }
                }

                if (
                    $data->waitlist_info['carer_relationship'] ||
                    $data->waitlist_info['care_consent_eme_contact'] ||
                    $data->waitlist_info['carer_consent_collect_child'] ||
                    $data->waitlist_info['care_consent_mak_medi_deci'] ||
                    $data->waitlist_info['carer_consent_incursion']) {

                    //Create emergency contact and link with additional carer

                    $request['email'] = ($data->waitlist_info['carer_email'] != '') ? strtolower($data->waitlist_info['carer_email']) : 'noreply@kinderm8.com.au';
                    $request['firstname'] = $data->waitlist_info['carer_firstname'];
                    $request['lastname'] = $data->waitlist_info['carer_lastname'];
                    $request['phone'] = $data->waitlist_info['carer_mobile'];
                    $request['phone2'] = $data->waitlist_info['carer_phone'];
                    $request['address1'] = $data->waitlist_info['carer_address'];

                    $request['consentEmergencyContact'] = $data->waitlist_info['care_consent_eme_contact'];
                    $request['consentCollectChild'] = $data->waitlist_info['carer_consent_collect_child'];
                    $request['consentMakeMedicalDecision'] = $data->waitlist_info['care_consent_mak_medi_deci'];
                    $request['consentIncursion'] = $data->waitlist_info['carer_consent_incursion'];
                    $request['relationship'] = $data->waitlist_info['carer_relationship'];

                    $this->child->setEmergencyContact($childAcc->id, $additionalCarer->id, $request);

                    $this->clearRequest($request);

                }

            }

            foreach ($data->waitlist_info['emergencyContacts'] as $value) {

                if (
                    !isset($value['emenrgencyEmail']) &&
                    !isset($value['emenrgencyPhone']) &&
                    !isset($value['emenrgencyhomeAddress']) &&
                    !isset($value['emenrgencylastName']) &&
                    !isset($value['emenrgencyFirtsName'])
                ) {
                    continue;
                }

                $request['role_name'] = 'emergency-contact';
                $request['email'] = (isset($value['emenrgencyEmail']) && $value['emenrgencyEmail'] != '') ? strtolower($value['emenrgencyEmail']) : 'noreply@kinderm8.com.au';
                $request['firstname'] = isset($value['emenrgencyFirtsName']) ? $value['emenrgencyFirtsName'] : '';
                $request['lastname'] = isset($value['emenrgencylastName']) ? $value['emenrgencylastName'] : '';
                $request['password'] = bcrypt('EmergencyContactPassword');
                $request['phone'] = isset($value['emenrgencyPhone']) ? $value['emenrgencyPhone'] : '';
                $request['address1'] = isset($value['emenrgencyhomeAddress']) ? $value['emenrgencyhomeAddress'] : '';
                $request['status'] = '0';

                $userAcc = $this->userRepo->store($request, 'Role');

                $request['consentEmergencyContact'] = isset($value['emenrgencyContact']) && $value['emenrgencyContact'] ? 1 : 0;
                $request['consentCollectChild'] = isset($value['emAddiAuthNomiColect']) && $value['emAddiAuthNomiColect'] ? 1 : 0;
                $request['consentMakeMedicalDecision'] = isset($value['emeAddiAuthNomiColMedi']) && $value['emeAddiAuthNomiColMedi'] ? 1 : 0;
                $request['consentIncursion'] = isset($value['emAdiAuthNominieeIncursion']) && $value['emAdiAuthNominieeIncursion'] ? 1 : 0;
                $request['consentDropOffAndPickUp'] = isset($value['emNomKioskApp']) && $value['emNomKioskApp'] ? 1 : 0;
                $request['consentTransportationArrange'] = isset($value['emNomTranspoSer']) && $value['emNomTranspoSer'] ? 1 : 0;

                $request['relationship'] = $value['emenrgencyRelationship'];

                $this->child->setEmergencyContact($childAcc->id, $userAcc->id, $request);

                $this->clearRequest($request);

            }

            /* room assign to child */
            $this->assignChildRoom($child_reference, $request, $parentInfo);

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->isBranchUser() && auth()->user()->branch->kinderconnect) {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                    [
                        'organization' => (auth()->user()->organization_id) ? auth()->user()->organization_id : null,
                        'branch' => ($data->branch_id) ? auth()->user()->branch_id : null,
                        'subjectid' => $childAcc->id,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::CHILD_SUBJECT
                );
            }

            $branch = $this->branchRepo->findById($data->branch_id);

            $loginUrl = PathHelper::getBranchUrls($request->fullUrl(), $branch);

            $branchLogin = $branch->kinderconnect === false ? $loginUrl : $this->getKinderConnectUrl($loginUrl);

            if ($parentInfo->login_access == '1') {

                // Send primary parent password set email

                $parentEmailUser = $this->userRepo->findById($parentInfo->id, ['organization', 'branch']);

                $parentEmailUser->notify(
                    new SendUserSetupPasswordMail(
                        $parentEmailUser,
                        $branchLogin,
                        $parentEmailUser->organization,
                        $parentEmailUser->branch,
                        PathHelper::getUserPasswordSetupInvitationPath($request->fullUrl(), Helpers::hxCode($parentInfo->id))
                    )
                );

            }

            if (isset($additionalCarer) && $additionalCarer->login_access == '1') {

                // Send additional carer password set email

                $additionalCarerUser = $this->userRepo->findById($additionalCarer->id, ['organization', 'branch']);

                $additionalCarerUser->notify(
                    new SendUserSetupPasswordMail(
                        $additionalCarerUser,
                        $branchLogin,
                        $additionalCarerUser->organization,
                        $additionalCarerUser->branch,
                        PathHelper::getUserPasswordSetupInvitationPath($request->fullUrl(), Helpers::hxCode($additionalCarerUser->id))
                    )
                );

            }

            // $childAcc->refresh();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                //$childAcc->index
                ),
                RequestType::CODE_201
            );
        } catch (Exception $e) {

            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param $childId
     * @param $request
     * @param $userAcc
     * @throws \Kinderm8\Exceptions\System\ResourceNotFoundException
     */
    public function assignChildRoom($childId, $request, $userAcc)
    {
        $childObj = $this->child->updateRooms($childId, $request, 'new');

        // send sns if branch is connected to current gen (kinder connect)
        /*  if ($userAcc->branch->kinderconnect) {
              $this->snsService->publishEvent(
                  Helpers::getConfig('kinder_connect_child', AWSConfigType::SNS),
                  [
                      'organization' => $userAcc->organization_id,
                      'branch' => $userAcc->branch_id,
                      'subjectid' => $childObj->id,
                      'action' => CurrentGenConnectType::ACTION_UPDATE
                  ],
                  CurrentGenConnectType::CHILD_SUBJECT
              );
          }*/
    }

    /**
     * @param $child_id
     * @param $enrolment_info
     * @param $parentId
     */
    public function childConsentsStore($child_id, $enrolment, $parentId)
    {
        $missedData = isset($enrolment->waitlist_info['section_inputs']) ? $enrolment->waitlist_info : WaitlistHelper::codeForOlderWaitlistInfoGenarate($enrolment->waitlist_info, $enrolment->organization_id, $enrolment->branch_id, $enrolment->status, true);
        $new_consents = $missedData['new_inputs'];
        $consents = $missedData['section_inputs']['enrolment']['consents']['inputs'];

        $enrolmentInputsOnly = array_values(array_filter($new_consents, function ($k) {
            return $k['section'] !== '';
        }, ARRAY_FILTER_USE_BOTH));


        /*e default consents store in array*/

        $question_answer = [];
//        foreach ($consents as $default_consent) {
//
//            $key = array_search($default_consent, array_column($new_consents, 'name'));
//
//            if (isset($new_consents[$key]) && $new_consents[$key]['input_type'] == 'switch') {
//                $question_answer[] = ['child_id' => $child_id, 'consent' => $new_consents[$key]['question'], 'answer' => !!$enrolment_info[$default_consent], 'created_by' => $parentId, 'created_at' => Carbon::now()];
//            }
//        }
//        Log::info($question_answer);

        /*new consents store to array*/

        foreach ($consents as $consent) {
            $key = array_search($consent, array_column($enrolmentInputsOnly, 'name'));
            if (isset($enrolmentInputsOnly[$key]['input_type']) && isset($enrolmentInputsOnly[$key]['section'])) {
                if ($enrolmentInputsOnly[$key]['input_type'] == 'switch' && $enrolmentInputsOnly[$key]['section'] == 'consents') {
                    ChildConsents::insert(['child_id' => $child_id, 'consent' => $enrolmentInputsOnly[$key]['question'], 'answer' => !!$enrolmentInputsOnly[$key]['values'], 'created_by' => $parentId, 'created_at' => Carbon::now()]);
                }
            }
        }

    }


    public function emailEzidebitForm($id)
    {

        $paymentMethodCount = ParentPaymentMethod::where('user_id', '=', $id)
            ->where(function ($query) {
                $query->where('status', '=', '0')->orWhere(function ($subquery) {
                    $subquery->where('status', '=', '1')->where('synced', '=', false);
                });
            })
            ->count();

        if ($paymentMethodCount > 0) {
            return;
        }

        $user = User::findOrFail($id);
        $org_id = $user->organization_id;
        $branch_id = $user->branch_id;

        $provider = ParentPaymentProvider::where('branch_id', $branch_id)
            ->where('organization_id', $org_id)
            ->where('status', '0')
            ->where('payment_type', '=', PaymentHelpers::PAYMENT_TYPES[1])
            ->get()
            ->first();

        if (!$provider) {

            throw new Exception('Payment provider not found. Please configure payment provider from site manager.', ErrorType::CustomValidationErrorCode);

        }

        $eddr_url = PaymentHelpers::getPaymentConfig('EDDR_URL', 'EZIDEBIT');
        $public_key = PaymentHelpers::getProviderKeyPair($provider)['public_key'];

        $reference = PaymentHelpers::generateParentEzidebitId();

        $payment = new ParentPaymentMethod();
        $payment->organization_id = $org_id;
        $payment->branch_id = $branch_id;
        $payment->user_id = $user->id;
        $payment->ref_id = $reference;
        $payment->payment_type = PaymentHelpers::PAYMENT_TYPES[1];
        $payment->first_name = $user->first_name;
        $payment->last_name = $user->last_name;
        $payment->phone = $user->phone_number;
        $payment->address1 = $user->address_1;
        $payment->address2 = $user->address_2;
        $payment->zip_code = $user->zip_code;
        $payment->city = $user->city;
        $payment->country_code = $user->country_code;
        $payment->state = $user->state;
        $payment->created_by = $user->id;
        $payment->payment_provider_id = $provider->id;
        $payment->synced = false;
        $payment->status = '1';

        $payment->save();

        $final_url = $eddr_url . '?a=' . $public_key . '&debits=4&businessOrPerson=1&uRef=' . $reference . '&email=' . $user->email;

        $user->notify(new OnSendParentEzidebitLink($final_url));

    }

    /**
     * @param $bookings
     * @return array
     */
    public function attendancePopulate($bookings)
    {
        $array = [];
        $days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'allDays'];
        $i = 0;
        foreach ($bookings as $book) {
            foreach ($book as $key => $day) {
                if ($day && array_search($key, array_column($array, 'name')) === false && array_search($key, $days) !== false) {
                    $array[$i]['name'] = $key;
                    $array[$i]['index'] = array_search($key, $days);
                    $array[$i]['is_weekend'] = (in_array($key, array('sunday', 'saturday')));
                    $i++;
                }
            }
        }
        $keys = array_column($array, 'index');
        array_multisort($keys, SORT_ASC, $array);
        return $array;
    }

    /**
     * @param $url
     * @return string|string[]
     */
    public function getKinderConnectUrl($url)
    {
        return str_replace("ccs-", "", $url);
    }

    /**
     * @param Request $request
     * @param $data
     * @param $childAcc
     * @return mixed
     */
    public function createParent(Request $request, $data, $childAcc)
    {
        $request['email'] = strtolower($data->waitlist_info['email']);
        $request['branch'] = Helpers::hxCode($data->branch_id);
        $request['org'] = Helpers::hxCode($data->organization_id);
        $request['firstname'] = $data->waitlist_info['parent_firstname'];
        $request['lastname'] = $data->waitlist_info['parent_lastname'];
        $request['password'] = bcrypt('EmergencyContactPassword');
        $request['dob'] = $data->waitlist_info['parent_dob'];
        $request['phone'] = $data->waitlist_info['parent_mobile'];
        $request['mobile'] = $data->waitlist_info['parent_phone'];
        $request['work_phone'] = isset($data->waitlist_info['work_phone']) ? $data->waitlist_info['work_phone'] : '';
        $request['work_mobile'] = isset($data->waitlist_info['parentWorkMob']) ? $data->waitlist_info['parentWorkMob'] : '';
        $request['address1'] = $data->waitlist_info['parent_address'];
        $request['city'] = $data->waitlist_info['parent_suburb'];
        $request['zipcode'] = $data->waitlist_info['parent_postalCode'];
        $request['ccs_id'] = $data->waitlist_info['parent_crn'];
        $request['country'] = $data->waitlist_info['parent_country'];
        $request['state'] = $data->waitlist_info['parent_state'];
        $request['status'] = '0';
//        $request['login_access'] = '1';
        $request['role_name'] = 'parent';

        $userAcc = $this->userRepo->store($request, 'Role');

        $childAcc->parents()->attach($userAcc->id);

        $this->clearRequest($request);

        // send sns if branch is connected to current gen (kinder connect)
        if ($userAcc->branch->kinderconnect) {
            $this->snsService->publishEvent(
                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                [
                    'organization' => $userAcc->organization_id,
                    'branch' => $userAcc->branch_id,
                    'subjectid' => $userAcc->id,
                    'role' => $userAcc->getRoleTypeForKinderConnect(),
                    'action' => CurrentGenConnectType::ACTION_CREATE
                ],
                CurrentGenConnectType::USER_SUBJECT
            );
        }

        return $userAcc;

    }

    /**
     * @param Request $request
     * @param $data
     * @param $childAcc
     * @return mixed
     */
    public function createAdditionalCarer(Request $request, $data, $childAcc)
    {


        $request['email'] = strtolower($data->waitlist_info['carer_email']);
        $request['branch'] = Helpers::hxCode($data->branch_id);
        $request['org'] = Helpers::hxCode($data->organization_id);
        $request['firstname'] = $data->waitlist_info['carer_firstname'];
        $request['lastname'] = $data->waitlist_info['carer_lastname'];
        $request['password'] = bcrypt('EmergencyContactPassword');
        $request['dob'] = $data->waitlist_info['carer_dob'];
        $request['phone'] = $data->waitlist_info['carer_mobile'];
        $request['mobile'] = $data->waitlist_info['carer_phone'];
        $request['work_phone'] = isset($data->waitlist_info['carer_work_phone']) ? $data->waitlist_info['carer_work_phone'] : '';
        $request['work_mobile'] = isset($data->waitlist_info['carer_work_mob']) ? $data->waitlist_info['carer_work_mob'] : '';
        $request['address1'] = $data->waitlist_info['carer_address'];
        $request['city'] = $data->waitlist_info['carer_suburb'];
        $request['zipcode'] = $data->waitlist_info['carer_postalCode'];
        $request['ccs_id'] = $data->waitlist_info['addition_carer_crn'];
        $request['country'] = $data->waitlist_info['carer_country'];
        $request['state'] = $data->waitlist_info['carer_state'];
        $request['status'] = '0';
//        $request['login_access'] = '1';
        $request['role_name'] = 'parent';

        $userAcc = $this->userRepo->store($request, 'Role');

        $childAcc->parents()->attach($userAcc->id);

        $this->clearRequest($request);

        // send sns if branch is connected to current gen (kinder connect)
        if ($userAcc->branch->kinderconnect) {
            $this->snsService->publishEvent(
                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                [
                    'organization' => $userAcc->organization_id,
                    'branch' => $userAcc->branch_id,
                    'subjectid' => $userAcc->id,
                    'role' => $userAcc->getRoleTypeForKinderConnect(),
                    'action' => CurrentGenConnectType::ACTION_CREATE
                ],
                CurrentGenConnectType::USER_SUBJECT
            );
        }

        return $userAcc;

    }

    /**
     * @return \Illuminate\Http\JsonResponse
     */
    public function sameEmailUse(): \Illuminate\Http\JsonResponse
    {
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_400,
                LocalizationHelper::getTranslatedText('enrolment.same_email_for_additional_carer_and_parent')
            ),
            RequestType::CODE_400
        );
    }

    public function sameMobileUse(): \Illuminate\Http\JsonResponse
    {
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_400,
                LocalizationHelper::getTranslatedText('enrolment.same_mobile_for_emergency_user')
            ),
            RequestType::CODE_400
        );
    }

    /**
     * @return \Illuminate\Http\JsonResponse
     */
    public function sameEmailUseForBranch()
    {
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_400,
                LocalizationHelper::getTranslatedText('enrolment.email_duplication_in_branch')
            ),
            RequestType::CODE_400
        );
    }

    /**
     * @param $url
     * @return string|string[]
     */
    public function getLoginUrl($url)
    {
        return str_replace("ccs-", "", $url);
    }

    /**
     * @param $request
     */
    public function clearRequest($request)
    {

        unset($request['email']);
        unset($request['branch']);
        unset($request['org']);
        unset($request['firstname']);
        unset($request['lastname']);
        unset($request['password']);
        unset($request['dob']);
        unset($request['phone']);
        unset($request['phone2']);
        unset($request['mobile']);
        unset($request['address1']);
        unset($request['city']);
        unset($request['zipcode']);
        unset($request['status']);
        unset($request['login_access']);
        unset($request['relationship']);
        unset($request['consentIncursion']);
        unset($request['consentMakeMedicalDecision']);
        unset($request['consentCollectChild']);
        unset($request['consentEmergencyContact']);
        unset($request['country']);
        unset($request['work_phone']);
        unset($request['work_mobile']);
        unset($request['state']);

    }

    /**
     * Delete user object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try {

            $type = $request->input('type');

            if ($type == '5' || $type == '6') {
                //enquiry
                $item = Enquiries::find(Helpers::decodeHashedID($request->input('id')));

            } else {
                $item = WaitListEnrollment::find(Helpers::decodeHashedID($request->input('id')));
            }

            if (is_null($item)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $item->delete();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getlink(Request $request)
    {

        try {
            $id = $request->input('id');

            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

            $branch_name = Branch::where('organization_id', '=', $organization_id)->where('id', '=', $branch_id)->get()->first();

            $link = PathHelper::getEnrollmentLink($request->fullUrl(), $id, $branch_name->subdomain_name, $branch_name->kinderconnect);

            return response()->json($link, 200);
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

    /**
     * @param Request $request
     * @return array|\Illuminate\Http\JsonResponse
     */
    public function getDashboardSummery(Request $request)
    {
        try {
            $organization_id = auth()->user()->organization_id;

            if (auth()->user()->hasOwnerAccess()) {
                $branch_id = ($request->input('branch_id') != null) ? Helpers::decodeHashedID($request->input('branch_id')) : null;
            } else {
                $branch_id = auth()->user()->branch_id;
            }

            if ($branch_id != null) {
                $enquiriesCount = Enquiries::where('organization_id', $organization_id)->where('branch_id', $branch_id)->whereIn('status', [0, 1]);
                $waitlistCount = WaitListEnrollment::where('organization_id', $organization_id)->where('branch_id', $branch_id)->whereIn('status', [0, 1]);
                $enroledCount = WaitListEnrollment::where('organization_id', $organization_id)->where('branch_id', $branch_id)->where('status', 2);
                $activatedEnrolmentsCount = WaitListEnrollment::where('organization_id', $organization_id)->where('branch_id', $branch_id)->where('status', 3);

            } else {
                $enquiriesCount = Enquiries::where('organization_id', $organization_id)->whereIn('status', [0, 1]);
                $waitlistCount = WaitListEnrollment::where('organization_id', $organization_id)->whereIn('status', [0, 1]);
                $enroledCount = WaitListEnrollment::where('organization_id', $organization_id)->where('status', 2);
                $activatedEnrolmentsCount = WaitListEnrollment::where('organization_id', $organization_id)->where('status', 3);
            }

            /*week wisely filter*/
            if (!Helpers::IsNullOrEmpty($request->input('start')) && !Helpers::IsNullOrEmpty($request->input('end'))) {
                $start = $request->input('start');
                $end = $request->input('end');

                $enquiriesCount->whereBetween('created_at', [$start . " 00:00:00", $end . " 23:59:59"]);
                $waitlistCount->whereBetween('created_at', [$start . " 00:00:00", $end . " 23:59:59"]);
                $enroledCount->whereBetween('created_at', [$start . " 00:00:00", $end . " 23:59:59"]);
                $activatedEnrolmentsCount->whereBetween('created_at', [$start . " 00:00:00", $end . " 23:59:59"]);
            }

            $waitlistData = [
                'enquiry_count' => $enquiriesCount->count(),
                'waitlist_count' => $waitlistCount->count(),
                'enrol_count' => $enroledCount->count(),
                'activated_count' => $activatedEnrolmentsCount->count()
            ];

            return $waitlistData;

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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEnrollmenWaitlisttDynamicData(Request $request)
    {

        try {
            $validator = Validator::make($request->all(), [
                'form' => ['required'],
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

            $branchId = auth()->user()->branch_id;;
            $organization_id = auth()->user()->organization_id;


            $questionTable = $this->formForObject($request['form']);

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branchId)->where('organization_id', '=', $organization_id)->get();


            if ($branchTemplateElements->isEmpty()) {
                $orgActive = true; // organize wise search
                $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', $organization_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sections) {
                    $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActive = false;
                }
                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($request, $orgActive, $organization_id) {
                    $query->whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])
                        ->where('branch_id', '=', null);
                    (!$orgActive) ? $query->where('organization_id', '=', null) : $query->where('organization_id', '=', $organization_id);
                    $query->orderBy('column_order');
                }])->whereIn('id', $sections)->orderBy('section_order')->get();
            } else {
                $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', $organization_id)->where('branch_id', $branchId)->groupBy('section_id')->pluck('section_id')->toArray();

                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($branchId, $request, $organization_id) {
                    $query->whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', $organization_id)->where('branch_id', '=', $branchId)->orderBy('column_order');
                }])->whereIn('id', $sections)->orderBy('section_order')->get();
            }
            return (new EnrolmentMasterCollection($branchTemplateElements))
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

    /**
     * @param $form
     * @return WaitlistEnrolmentQuestions|WaitlistQuestions|WaitlistEnquiryQuestions
     */
    public function formForObject($form)
    {
        if ($form == 'enquiry') {
            $questionTable = new WaitlistEnquiryQuestions();
        } else if ($form == 'waitlist') {
            $questionTable = new WaitlistQuestions();
        } else {
            $questionTable = new WaitlistEnrolmentQuestions();
        }
        return $questionTable;
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEnrollmentDynamicDataPublic(Request $request)
    {

        try {
            $validator = Validator::make($request->all(), [
                'form' => ['required'],
                'branch_id' => ['required'],
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

            $branchId = Helpers::decodeHashedID($request->input('branch_id'));
            $organization_id = $this->branchRepo->findById($branchId)->organization_id;

            $questionTable = $this->formForObject($request['form']);
            $branchTemplateElements = $questionTable::where('branch_id', '=', $branchId)->where('organization_id', '=', $organization_id)->get();

            if ($branchTemplateElements->isEmpty()) {
                $orgActive = true; // organize wise search
                $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', $organization_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sections) {
                    $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActive = false;
                }

                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($organization_id, $request, $orgActive) {
                    $query->whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])
                        ->where('branch_id', '=', null)->where('hidden', '=', '1');
                    (!$orgActive) ? $query->where('organization_id', '=', null) : $query->where('organization_id', '=', $organization_id);
                    $query->orderBy('column_order');
                }])->where('hide_status', '=', '1')->whereIn('id', $sections)->orderBy('section_order')->get();

            } else {
                $sections = $questionTable::where('branch_id', $branchId)->where('organization_id', $organization_id)->where('hidden', '1')->groupBy('section_id')->pluck('section_id')->toArray();
                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($branchId, $organization_id) {
                    $query->where('hidden', '=', '1')->where('organization_id', $organization_id)->where('branch_id', '=', $branchId)->orderBy('column_order')->orderBy('id');
                }])->where('hide_status', '=', '1')->whereIn('id', $sections)->orderBy('section_order')->get();
            }

            return (new EnrolmentMasterCollection($branchTemplateElements))
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function enrollChildMaster(Request $request)
    {
        DB::beginTransaction();
        try {

            $validator = Validator::make($request->all(), [
                'form_data' => ['required'],
                'form' => ['required'],
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

            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

//            $questions = WaitlistEnrolmentQuestions::where('branch_id', $branch_id)->get();
//            if (!$questions->isEmpty()) {
//                return response()->json(
//                    RequestHelper::sendResponse(
//                        RequestType::CODE_400,
//                        LocalizationHelper::getTranslatedText('system.resource_exists')
//                    ),
//                    RequestType::CODE_400
//                );
//            }

            $formData = $request->input('form_data');

            $keys = array_keys($formData);
            $to_remove = array('agreement', 'recaptcha');/* remove unnecessary keys*/
            $keys = array_diff($keys, $to_remove);


            /*site manager can change all exists  branches and  further own branches for set form template settings( waitlist & enrolment )*/
            /*getting site manager own all branches*/
            $questionTable = $this->formForObject($request['form']);
            $questionTable = $questionTable::where('organization_id', '=', $organization_id);

            if ($branch_id) { // for branch manager
                $organizationForAllBranches = $questionTable->where('branch_id', $branch_id)->groupBy('branch_id')->pluck('branch_id')->toArray();
                $organizationForAllBranches = (!$organizationForAllBranches) ? array($branch_id) : $organizationForAllBranches;
            } else {  // for site manager
                $this->organizationDownLevelBranchesRelateDelete($request['form'], $organization_id);
                $organizationForAllBranches = $questionTable->groupBy('branch_id')->pluck('branch_id')->toArray();
                $organizationForAllBranches = (!$organizationForAllBranches) ? array(null) : $organizationForAllBranches;
            }
            unset($questionTable);


            foreach ($organizationForAllBranches as $branch) {

                $questionTable = $this->formForObject($request['form']);


                foreach ($keys as $key) {

                    $sectionId = null;
                    $inputKeys = array_keys($formData[$key]);
                    $questionObj = [];
                    foreach ($inputKeys as $inputKey) {

                        /*input types get for branch own*/
                        $questions = $questionTable::where('input_name', $inputKey)->where('branch_id', $branch)->where('organization_id', '=', $organization_id);
                        /*filter section settings key and non default fields (branch id  null fields)*/
                        if ($questions->get()->isEmpty()) {
                            $questions = $questionTable::where('input_name', $inputKey)->where('organization_id', '=', $organization_id)->where('branch_id', '=', null);// get organization inputs if not have branch wisely
                            if ($questions->get()->isEmpty()) {
                                $questions = $questionTable::where('input_name', $inputKey)->where('organization_id', '=', null);//get common inputs
                            }
                        }

                        if (!$questions->get()->isEmpty()) {
                            $question = $questions->get()->toArray()[0];

                            /*gather data before save*/
                            $questionObj[] = [
                                'section_id' => $question['section_id'],
                                'input_name' => $question['input_name'],
                                'input_placeholder' => $formData[$key][$inputKey][$question['input_placeholder_name']],
                                'input_mandatory' => ($formData[$key][$inputKey][$question['input_required']] == '') ? 1 : 0,
                                'hidden' => ($formData[$key][$inputKey][$question['input_hiddenfield_name']] == '') ? 1 : 0,
                                'input_type' => $question['input_type'],
                                'question' => $question['question'],
                                'input_required' => $question['input_required'],
                                'input_hiddenfield_name' => $question['input_hiddenfield_name'],
                                'input_placeholder_name' => $question['input_placeholder_name'],
                                'input_mandatory_changeable' => $question['input_mandatory_changeable'],
                                'types' => \GuzzleHttp\json_encode(($question['types'] == '') ? '' : $question['types']),
                                'column_width' => $question['column_width'],
                                'column_height' => $question['column_height'],
                                'column_order' => $formData[$key][$inputKey]['order'],
                                'access_for' => $question['access_for'],
                                'status' => $question['status'],
                            ];
                        }

                        /*section for data gather */
                        if ($inputKey == 'section_settings') {

                            $branchQuestion = WaitlistEnrolmentSections::whereHas('questions_' . $request['form'], function ($query) use ($branch, $organization_id) {
                                $query->where('branch_id', '=', $branch)->where('organization_id', '=', $organization_id);
                            })->where('section_code', $key)->get();

                            if ($branchQuestion->isEmpty()) {
                                $sectionId = null;
                                $newSection = new WaitlistEnrolmentSections();
                            } else {
                                $sectionId = $branchQuestion->first()->toArray()['id'];
                                $newSection = WaitlistEnrolmentSections::find($sectionId);
                            }

                            $newSection->section_code = $key;
                            $newSection->section_name = $formData[$key][$inputKey]['section_name'];
                            $newSection->mandatory = ($formData[$key][$inputKey]['mandatory'] == 'true') ? 0 : 1;
                            $newSection->section_position_static = ($formData[$key][$inputKey]['section_position_static'] == 'true') ? 0 : 1;
                            $newSection->section_order = $formData[$key][$inputKey]['section_order'];
                            $newSection->hide_status = ($formData[$key][$inputKey]['section_hide'] == 'true') ? 0 : 1;
                            $newSection->save();


                        }

                    }

                    foreach ($questionObj as $qu) {

                        /* update or create main dynamic data fin master enrollment form*/
                        $newQuestion = $questionTable::where('input_name', $qu['input_name'])->where('section_id', $sectionId)->where('branch_id', $branch)->where('organization_id', '=', $organization_id)->get();


                        if ($newQuestion->isEmpty()) {
                            $newQuestion = $this->formForObject($request['form']);
                        } else {
                            $quesId = $newQuestion->first()->toArray()['id'];
                            $newQuestion = $questionTable::find($quesId);
                        }

                        $newQuestion->organization_id = $organization_id;
                        $newQuestion->branch_id = $branch;
                        $newQuestion->input_name = $qu['input_name'];
                        $newQuestion->input_placeholder = $qu['input_placeholder'];
                        $newQuestion->input_mandatory = $qu['input_mandatory'];
                        $newQuestion->hidden = $qu['hidden'];
                        $newQuestion->input_type = $qu['input_type'];
                        $newQuestion->question = $qu['question'];
                        $newQuestion->input_required = $qu['input_required'];
                        $newQuestion->input_hiddenfield_name = $qu['input_hiddenfield_name'];
                        $newQuestion->input_placeholder_name = $qu['input_placeholder_name'];
                        $newQuestion->input_mandatory_changeable = $qu['input_mandatory_changeable'];
                        $newQuestion->types = $qu['types'];
                        $newQuestion->column_width = $qu['column_width'];
                        $newQuestion->column_height = $qu['column_height'];
                        $newQuestion->column_order = $qu['column_order'];
                        $newQuestion->access_for = $qu['access_for'];
                        $newQuestion->status = $qu['status'];
                        if ($request['form'] == 'waitlist') {
                            $newSection->questions_waitlist()->save($newQuestion);
                        } else if ($request['form'] == 'enquiry') {
                            $newSection->questions_enquiry()->save($newQuestion);
                        } else {
                            $newSection->questions_enrolment()->save($newQuestion);
                        }


                    }
                }
            }
            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
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

    /**
     * @param $form
     * @param $org
     * @return bool
     */
    public function organizationDownLevelBranchesRelateDelete($form, $org)
    {
        $questionTable = $this->formForObject($form);
        $questionTable::where('branch_id', '!=', null)->where('organization_id', '=', $org)->forceDelete();
        return true;
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function enrollChildSavePublic(Request $request)
    {

        try {
            /*validations*/

            $validator = Validator::make($request->all(), [
                'child_first_name' => ['required'],
                'form' => ['required'],
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

            $email = strtolower($request->input('parent_email'));
            $parent_mobile = $request->input('parent_mobile');
            $emergencyContatcts = $request->input('emergency');
            $carer_mobile = $request->input('carer_mobile');

            $emergencyPhone = array();
            foreach ($emergencyContatcts as $emergencyContact) {
                /* catch emergency contact with parent mobile number*/
                if ($emergencyContact['emenrgencyPhone'] == $parent_mobile) {
                    return $this->sameMobileUse();
                }

                /* duplicated emergency contact*/
                if (!in_array($emergencyContact['emenrgencyPhone'], $emergencyPhone)) {
                    array_push($emergencyPhone, $emergencyContact['emenrgencyPhone']);
                } else {
                    return $this->sameMobileUse();
                }
            }

            if ($carer_mobile != '' && $parent_mobile == $carer_mobile) {
                return $this->sameMobileUse();
            }

            if ($request->input('carer_email') !== '' && strtolower($request->input('parent_email')) == strtolower($request->input('carer_email'))) {
                return $this->sameEmailUse();
            }
            /* end validator*/

            $enrollinfo = ($request->get('waitlist_id') != '') ? WaitListEnrollment::find(Helpers::decodeHashedID($request->get('waitlist_id'))) : '';

            $org_id = Helpers::decodeHashedID($request->input('org_id'));
            $branch_id = Helpers::decodeHashedID($request->input('branch_id'));
            $child_bornOrNot = ($enrollinfo != '') ? $enrollinfo->waitlist_info['child_bornOrNot'] : 0;
            $child_firstname = $request->get('child_first_name');
            $child_middlename = $request->get('child_middle_name');
            $child_lastname = $request->get('child_last_name');
            $child_gender = $request->get('child_gender');
            $sibilings = $request->get('sibilings');
//            $number_of_sibilings = (isset($enrollinfo->waitlist_info['number_of_sibilings']) ? $enrollinfo->waitlist_info['number_of_sibilings'] : 0);
            $chil_crn = $request->get('child_crn');

            $child_date_of_birth = $request->get('child_dob');
            $child_address = $request->get('child_address');
            $child_state = $request->get('child_state');
            $child_suburb = $request->get('child_suburb');
            $child_postcode = $request->get('child_postcode');
            $child_courtorders = $request->get('courtorders_chk');
            $enrolment_date = $request->get('child_enrolment_date');
            // $child_enrollment_start_date = $request->input('child_enrollment_start_date');
            $priority = ($enrollinfo != '') ? $enrollinfo->waitlist_info['priority'] : '';
            $parent_firstname = $request->input('parent_first_name');
            $parent_middlename = $request->input('parent_middle_name');
            $parent_lastname = $request->input('parent_last_name');
            $parent_dob = $request->input('parent_dob');

            $parent_crn = $request->input('parent_crn') ? $request->input('parent_crn') : '';
            $parent_address = $request->input('parent_address');
            $parent_suburb = $request->input('parent_suburb');
            $parent_country = $request->input('parent_country');
            $parent_postalCode = $request->input('parent_postalCode');
            $parent_state = $request->input('parent_state');
            $parent_phone = $request->input('parent_phone');
            $hearAbout = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAbout'] : '';
            $hearAboutOther = ($enrollinfo != '') ? $enrollinfo->waitlist_info['hearAboutOther'] : '';

            $child_circumstances = $request->input('child_circumstances');
            $child_aboriginal = $request->input('child_aboriginal');
            $cultural_background = $request->input('cultural_background');
            $spoken_language = $request->input('spoken_language');
            $cultural_requirement_chk = $request->input('cultural_requirement_chk');
            $cultural_requirement = $request->input('cultural_requirement');
            $religious_requirements_chk = $request->input('religious_requirements_chk');
            $religious_requirements = $request->input('religious_requirements');
            // $expected_start_date = $request->input('expected_start_date');
            $bookings = $request->input('bookings');
            $child_medical_number = $request->input('child_medical_number');
            $child_medicalexpiry_date = $request->input('child_medicalexpiry_date');
            $ambulance_cover_no = $request->input('ambulance_cover_no');
            $child_heallth_center = $request->input('child_heallth_center');
            $practitioner_name = $request->input('practitioner_name');
            $practitioner_address = $request->input('practitioner_address');
            $practitioner_phoneNo = $request->input('practitioner_phoneNo');
            $health_record_chk = $request->input('health_record_chk');
            $immunised_chk = $request->input('immunised_chk');
            $prescribed_medicine_chk = $request->input('prescribed_medicine_chk');
            $allergies = $request->input('allergiesArray');
            $anaphylaxis_chk = $request->input('anaphylaxis_chk');
            $birth_certificate = $request->input('birth_certificate');
            $asthma_chk = $request->input('asthma_chk');
            $other_health_conditions_chk = $request->input('other_health_conditions_chk');
            $epipen_chk = $request->input('epipen_chk');
            //parent new details
            $relationship = $request->input('relationship');
            $work_address = $request->input('work_address');
            $work_phone = $request->input('work_phone');
            $parentWorkMob = $request->input('parentWorkMob');
            $work_email = strtolower($request->input('work_email'));
            $occupation = $request->input('occupation');
            $consent_incursion = $request->input('consent_incursion');
            $consent_make_medical_decision = $request->input('consent_make_medical_decision');
            $consent_emergency_contact = $request->input('consent_emergency_contact');
            $consent_collect_child = $request->input('consent_collect_child');
            $addition_carer_crn = $request->input('addition_carer_crn');
            $parent_spoken_language = $request->input('parent_spoken_language');
            $parent_cultural_background = $request->input('parent_cultural_background');
            $parent_aboriginal = $request->input('parent_aboriginal');
            // carer details
            $carer_relationship = $request->input('carer_relationship');
            $carer_firstname = $request->input('carer_firstname');
            $carer_middlename = $request->input('carer_middlename');
            $carer_lastname = $request->input('carer_lastname');
            $carer_dob = $request->input('carer_dob');
            $carer_email = strtolower($request->input('carer_email'));
            $carer_address = $request->input('carer_address');
            $carer_suburb = $request->input('carer_suburb');
            $carer_country = $request->input('carer_country');
            $carer_postalCode = $request->input('carer_postalCode');
            $carer_state = $request->input('carer_state');
            $carer_phone = $request->input('carer_phone');
            $carer_work_phone = $request->input('carer_work_phone');
            $carer_work_address = $request->input('carer_work_address');
            $carer_work_mob = $request->input('carer_work_mob');
            $carer_work_email = strtolower($request->input('carer_work_email'));
            $carer_occupation = $request->input('carer_occupation');
            $carer_consent_incursion = $request->input('carer_consent_incursion');
            $carer_consent_make_medical_decision = $request->input('care_consent_mak_medi_deci');
            $carer_consent_emergency_contact = $request->input('care_consent_eme_contact');
            $carer_consent_collect_child = $request->input('carer_consent_collect_child');
            $carer_spoken_language = $request->input('carer_spoken_language');
            $carer_cultural_background = $request->input('carer_cultural_background');
            $carer_aboriginal = $request->input('carer_aboriginal');
            // emergency contact details
            $nappyChange = $request->input('nappyChange');
            $bottleFeed = $request->input('bottleFeed');

            //additional consents
            $consent1 = $request->input('consent1');
            $consent2 = $request->input('consent2');
            $consent3 = $request->input('consent3');
            $consent4 = $request->input('consent4');
            $consent5 = $request->input('consent5');
            $consent6 = $request->input('consent6');
            $consent7 = $request->input('consent7');
            $consent8 = $request->input('consent8');
            $new_inputs = $request->input('new_inputs');
            // Upload Files
            $upload_files = $request->input('upload_files');

            $inputsForNewSections = [];
            /*accessible data set find (can branch,can organization or global) === enrolment*/

            $questionTable = new WaitlistEnrolmentQuestions();

            $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();

            $accessibilityEnrol = '';

            if ($branchTemplateElements->isEmpty()) {
                $accessibilityEnrol = 'organize_wise';
                $orgActiveEnrol = true; // organize wise search
                $sectionsEnrol = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sectionsEnrol) {
                    $sectionsEnrol = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActiveEnrol = false;
                    $accessibilityEnrol = 'global';
                }
            } else {
                $sectionsEnrol = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enrolment'])->where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
            }

            $newCollection = array();
//            $dontNeed = array('addEmergencyContact');
            $dontNeed = array();

            foreach ($new_inputs as $new_input) {
                foreach ($new_input['data'] as $input) {

                    /*enrolment filter*/
                    $branchElementEnrolment = WaitlistEnrolmentQuestions::whereIn('section_id', $sectionsEnrol)->where('section_id', Helpers::decodeHashedID($new_input['section_id']))->where('input_name', $input['name'])->where('hidden', '=', 1);

                    if ($accessibilityEnrol !== '') {
                        $branchElementEnrolment = ($orgActiveEnrol) ? $branchElementEnrolment->where('organization_id', $org_id)->where('branch_id', null) : $branchElementEnrolment->where('organization_id', null)->where('branch_id', null);
                    } else {
                        $branchElementEnrolment = $branchElementEnrolment->where('organization_id', $org_id)->where('branch_id', $branch_id);
                    }
                    $branchElementEnrolment = $branchElementEnrolment->get();
                    /* / enrolment filter*/


                    if (!$branchElementEnrolment->isEmpty() && !in_array($input['name'], $dontNeed)) {
                        $branchElementEnrolment = $branchElementEnrolment->first();
                        $input += ['section' => $new_input['section']];
                        $input += ['input_type' => $branchElementEnrolment['input_type']];
                        $input += ['question' => $branchElementEnrolment['question']];
                        $input += ['placeholder' => $branchElementEnrolment['input_placeholder']];
                        $input += ['required' => $branchElementEnrolment['input_mandatory'] ? false : true];
                        $input += ['types' => $branchElementEnrolment['types']];
                        $input += ['height' => $branchElementEnrolment['column_height']];
                        if ($branchElementEnrolment['input_type'] == 'date-picker') {
                            $input['values'] = ($input['values'] != '') ? date('Y-m-d', strtotime($input['values'])) : '';
                        }
                        $section = WaitlistEnrolmentSections::find($branchElementEnrolment['section_id']);

                        $inputsForNewSections['enrolment'][$new_input['section']]['name'] = $section['section_name'];
                        $inputsForNewSections['enrolment'][$new_input['section']]['order'] = $section['section_order'];
                        $inputsForNewSections['enrolment'][$new_input['section']]['code'] = $section['section_code'];
                        $inputsForNewSections['enrolment'][$new_input['section']]['inputs'][] = $input['name'];
                    }
                    $newCollection [] = $input;
                }
            }


            /* number of siblings get */
            $user = User::where('email', $email)->get()->first();
            $number_of_sibilings = ($user) ? $user->child()->count() : 0;
//            $sibilings = (int)$number_of_sibilings > 0;

            /* -----------------END extra details for enrollment form submit */
            $waitListObj = [
                'child_bornOrNot' => ($child_bornOrNot != '') ? $child_bornOrNot : 0,
                'child_firstname' => ($child_firstname != '') ? $child_firstname : '',
                'child_middlename' => ($child_middlename != '') ? $child_middlename : '',
                'child_lastname' => ($child_lastname != '') ? $child_lastname : '',
                'child_gender' => $child_gender,
                'sibilings' => $sibilings,
                'number_of_sibilings' => $number_of_sibilings,
                'chil_crn' => ($chil_crn != '') ? $chil_crn : '',
                'priority' => ($priority != '') ? $priority : '',
                'child_date_of_birth' => ($child_date_of_birth != '') ? $child_date_of_birth : '',
                'enrollment_start_date' => ($enrolment_date != '') ? $enrolment_date : '',
                'attendance' => ($enrollinfo != '') ? $enrollinfo->waitlist_info['attendance'] : '',
                'child_address' => ($child_address != '') ? $child_address : '',
                'child_state' => ($child_state != '') ? $child_state : '',
                'child_suburb' => ($child_suburb != '') ? $child_suburb : '',
                'child_postcode' => ($child_postcode != '') ? $child_postcode : '',
                'child_courtorders' => ($child_courtorders != '') ? $child_courtorders : 0,
                'parent_firstname' => ($parent_firstname != '') ? $parent_firstname : '',
                'parent_middlename' => ($parent_middlename != '') ? $parent_middlename : '',
                'parent_lastname' => ($parent_lastname != '') ? $parent_lastname : '',
                'parent_dob' => ($parent_dob != '') ? $parent_dob : '',
                'email' => ($email != '') ? $email : '',
                'parent_crn' => ($parent_crn != '') ? $parent_crn : '',
                'parent_address' => ($parent_address != '') ? $parent_address : '',
                'parent_country' => ($parent_country != '') ? $parent_country : '',
                'parent_suburb' => ($parent_suburb != '') ? $parent_suburb : '',
                'parent_postalCode' => ($parent_postalCode != '') ? $parent_postalCode : '',
                'parent_state' => ($parent_state != '') ? $parent_state : '',
                'parent_phone' => ($parent_phone != '') ? $parent_phone : '',
                'parent_mobile' => ($parent_mobile != '') ? $parent_mobile : '',
                'hearAbout' => ($hearAbout != '') ? $hearAbout : '',
                'hearAboutOther' => ($hearAboutOther != '') ? $hearAboutOther : '',

                /*------------------- extra details for enrollment form submit */
                'child_circumstances' => ($child_circumstances != '') ? $child_circumstances : '',
                'child_aboriginal' => ($child_aboriginal != '') ? $child_aboriginal : '',
                'cultural_background' => ($cultural_background != '') ? $cultural_background : '',
                'spoken_language' => ($spoken_language != '') ? $spoken_language : '',
                'cultural_requirement_chk' => ($cultural_requirement_chk != '') ? 1 : 0,
                'cultural_requirement' => ($cultural_requirement != '') ? $cultural_requirement : '',
                'religious_requirements_chk' => ($religious_requirements_chk != '') ? 1 : 0,
                'religious_requirements' => ($religious_requirements != '') ? $religious_requirements : '',
                // 'expected_start_date' => ($expected_start_date != '') ? $expected_start_date : '',
                'bookings' => ($bookings != '') ? $bookings : '',
                'child_medical_number' => ($child_medical_number != '') ? $child_medical_number : '',
                'child_medicalexpiry_date' => ($child_medicalexpiry_date != '') ? $child_medicalexpiry_date : '',
                'ambulance_cover_no' => ($ambulance_cover_no != '') ? $ambulance_cover_no : '',
                'child_heallth_center' => ($child_heallth_center != '') ? $child_heallth_center : '',
                'practitioner_name' => ($practitioner_name != '') ? $practitioner_name : '',
                'practitioner_address' => ($practitioner_address != '') ? $practitioner_address : '',
                'practitioner_phoneNo' => ($practitioner_phoneNo != '') ? $practitioner_phoneNo : '',
                'health_record_chk' => ($health_record_chk != '') ? 1 : 0,
                'immunised_chk' => ($immunised_chk != '') ? 1 : 0,
                'prescribed_medicine_chk' => ($prescribed_medicine_chk != '') ? 1 : 0,
                'allergiesArray' => ($allergies != '') ? $allergies : '',
                'anaphylaxis_chk' => ($anaphylaxis_chk != '') ? 1 : 0,
                'birth_certificate' => ($birth_certificate != '') ? 1 : 0,
                'asthma_chk' => ($asthma_chk != '') ? 1 : 0,
                'other_health_conditions_chk' => ($other_health_conditions_chk != '') ? 1 : 0,
                'epipen_chk' => ($epipen_chk != '') ? 1 : 0,
                //parent new details
                'relationship' => ($relationship != '') ? $relationship : '',
                'work_address' => ($work_address != '') ? $work_address : '',
                'work_phone' => ($work_phone != '') ? $work_phone : '',
                'parentWorkMob' => ($parentWorkMob != '') ? $parentWorkMob : '',
                'work_email' => ($work_email != '') ? $work_email : '',
                'occupation' => ($occupation != '') ? $occupation : '',
                'consent_incursion' => $consent_incursion,
                'consent_make_medical_decision' => $consent_make_medical_decision,
                'consent_emergency_contact' => $consent_emergency_contact,
                'consent_collect_child' => $consent_collect_child,
                'addition_carer_crn' => ($addition_carer_crn != '') ? $addition_carer_crn : '',
                'parent_spoken_language' => ($parent_spoken_language != '') ? $parent_spoken_language : '',
                'parent_cultural_background' => ($parent_cultural_background != '') ? $parent_cultural_background : '',
                'parent_aboriginal' => ($parent_aboriginal != '') ? $parent_aboriginal : '',
                // carer details
                'carer_relationship' => ($carer_relationship != '') ? $carer_relationship : '',
                'carer_firstname' => ($carer_firstname != '') ? $carer_firstname : '',
                'carer_middlename' => ($carer_middlename != '') ? $carer_middlename : '',
                'carer_lastname' => ($carer_lastname != '') ? $carer_lastname : '',
                'carer_dob' => ($carer_dob != '') ? $carer_dob : '',
                'carer_email' => ($carer_email != '') ? $carer_email : '',
                'carer_address' => ($carer_address != '') ? $carer_address : '',
                'carer_suburb' => ($carer_suburb != '') ? $carer_suburb : '',
                'carer_country' => ($carer_country != '') ? $carer_country : '',
                'carer_postalCode' => ($carer_postalCode != '') ? $carer_postalCode : '',
                'carer_state' => ($carer_state != '') ? $carer_state : '',
                'carer_phone' => ($carer_phone != '') ? $carer_phone : '',
                'carer_mobile' => ($carer_mobile != '') ? $carer_mobile : '',
                'carer_work_address' => ($carer_work_address != '') ? $carer_work_address : '',
                'carer_work_phone' => ($carer_work_phone != '') ? $carer_work_phone : '',
                'carer_work_mob' => ($carer_work_mob != '') ? $carer_work_mob : '',
                'carer_work_email' => ($carer_work_email != '') ? $carer_work_email : '',
                'carer_occupation' => ($carer_occupation != '') ? $carer_occupation : '',
                'carer_consent_incursion' => $carer_consent_incursion,
                'care_consent_mak_medi_deci' => $carer_consent_make_medical_decision,
                'care_consent_eme_contact' => $carer_consent_emergency_contact,
                'carer_consent_collect_child' => $carer_consent_collect_child,
                'carer_spoken_language' => ($carer_spoken_language != '') ? $carer_spoken_language : '',
                'carer_cultural_background' => ($carer_cultural_background != '') ? $carer_cultural_background : '',
                'carer_aboriginal' => ($carer_aboriginal != '') ? $carer_aboriginal : '',
                // emergency contact details
                'emergencyContacts' => (count($emergencyContatcts) > 0) ? $emergencyContatcts : '',
                'bottleFeed' => ($bottleFeed != '') ? $bottleFeed : 0,
                'nappyChange' => ($nappyChange != '') ? $nappyChange : 0,
                // emergencyContatcts
                //additional consents
                'consent1' => ($consent1 != '') ? $consent1 : 0,
                'consent2' => ($consent2 != '') ? $consent2 : 0,
                'consent3' => ($consent3 != '') ? $consent3 : 0,
                'consent4' => ($consent4 != '') ? $consent4 : 0,
                'consent5' => ($consent5 != '') ? $consent5 : 0,
                'consent6' => ($consent6 != '') ? $consent6 : 0,
                'consent7' => ($consent7 != '') ? $consent7 : 0,
                'consent8' => ($consent8 != '') ? $consent8 : 0,
                'new_inputs' => $newCollection,
//                'element_settings' => $this->DynamicDataColumnConverter(Helpers::decodeHashedID($request->input('branch_id')), Helpers::decodeHashedID($request->input('org_id')), 'enrolment'),
                'upload_files' => $upload_files,
                'section_inputs' => $inputsForNewSections
                /* -----------------END extra details for enrollment form submit */
            ];

            DB::beginTransaction();

            if ($enrollinfo == '') {
                $enrollinfo = new WaitListEnrollment();
                $enrollinfo->waitlist_info = $waitListObj;
                $enrollinfo->status = '2';
                $enrollinfo->organization_id = Helpers::decodeHashedID($request->input('org_id'));
                $enrollinfo->branch_id = Helpers::decodeHashedID($request->input('branch_id'));
            } else {
                $enrollinfo->waitlist_info = $waitListObj;
                $enrollinfo->status = '2';
            }

            $enrollinfo->save();

            DB::commit();
            $branch = Branch::find($branch_id);
            $branch_settings = $branch->center_settings;
            $branch_name = ($branch) ? $branch->subdomain_name : '';
            $redirect_url = (isset($branch_settings['enquiry_redirection_url']) && ($branch_settings['enquiry_redirection_url'] != '')) ? $branch_settings['enquiry_redirection_url'] : '';

            /* branch managers for send notification*/
            $braMangers = $this->userRepo->findAdministrativeUsersForBranchWithEmailSettings($org_id, $branch_id, '', false, false, false);

            foreach ($braMangers as $braManager) {
                $canSend = true;
                $emailTypes = $braManager->emailTypes;
                if (!empty($emailTypes) && sizeof($emailTypes) != 0) {
                    $key = array_search(CRMType::ENROLMENT_CODE, array_column(json_decode(json_encode($braManager->emailTypes), true), 'type'));
                    if (isset($emailTypes[$key]['pivot']['status']) && !$emailTypes[$key]['pivot']['status']) {
                        $canSend = false;
                    }
                }

                if ($canSend) {
                    Log::info('Email Type : enrolment | branch :' . $branch_name . ' | Email owner organization->branch : ' . $braManager->organization->company_name . '->' . (isset($braManager->branch->subdomain_name) ? $braManager->branch['subdomain_name'] : ' SITE MANAGER | ') . ' | email:  ' . $braManager->email);
                    $braManager->notify(new SendCrmAdministrativeMail(
                        $branch,
                        'enrolment',
                        $branch_name . ' - ' . LocalizationHelper::getTranslatedText('email.crm_enrolment_add')));
                }
            }

//            $enrollinfo->notify(new SendEnrolmentConfirmationMail(
//                $branch,
//                \ImageHelper::getBranchImagePath($branch->branch_logo)
//            ));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $redirect_url
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

    /**
     * @param null $branchId
     * @param string $form
     * @return array
     */
    public function DynamicDataColumnConverter($branchId, $organization_id, $form = 'enrolment')
    {
//        $branchId = auth()->user()->branch_id;;
//        $organization_id = auth()->user()->organization_id;

        $array = array('child_firstname' => 'firstname', 'child_middlename' => 'middlename', 'child_lastname' => 'lastname', 'child_gender' => 'childGender', 'child_date_of_birth' => 'dateOfBirth', 'chil_crn' => 'crn', 'sibilings' => 'siblingAttend', 'child_address' => 'childAddress', 'child_state' => 'child_state', 'child_suburb' => 'childSuburb', 'child_postcode' => 'childPostcode', 'courtorders_chk' => 'courtAppointed', 'parent_firstname' => 'parentFirstname', 'parent_middlename' => 'parentmiddlename', 'parent_lastname' => 'parentlastname', 'parent_dob' => 'parentdateOfBirth', 'email' => 'parentEmail', 'parent_address' => 'parentAddress', 'parent_country' => 'parentCountry', 'parent_suburb' => 'parentSuburb', 'parent_postalCode' => 'parentPC', 'parent_state' => 'parentState', 'parent_phone' => 'parentPhone', 'parent_mobile' => 'parentMobile', 'child_circumstances' => 'childCircumstances', 'child_aboriginal' => 'straitIslande', 'cultural_background' => 'culturalBackground', 'spoken_language' => 'spokenHome', 'enrollment_start_date' => 'startDate', 'cultural_requirement_chk' => 'cultuaral_requirements_switch', 'cultural_requirement' => 'culturalRequirements', 'emenrgencyFirtsName' => 'emenrgencyFirtsName', 'emenrgencylastName' => 'emenrgencylastName', 'emenrgencyPhone' => 'emenrgencyPhone', 'emenrgencyhomeAddress' => 'emenrgencyhomeAddress', 'emenrgencyEmail' => 'emenrgencyEmail', 'emenrgencyRelationship' => 'emenrgencyRelationship', 'emergencyType' => 'emenrgencyType', 'religious_requirements_chk' => 'religiousRequirements', 'religious_requirements' => 'religiousRequirements', 'bookings' => 'preferedDate', 'child_medical_number' => 'medicareNumber', 'child_medicalexpiry_date' => 'medicareExopiry', 'ambulance_cover_no' => 'ambulanceCover', 'child_heallth_center' => 'healthCentre', 'practitioner_name' => 'medicalService', 'practitioner_address' => 'medicalServiceAddress', 'practitioner_phoneNo' => 'medicalServicePhone', 'health_record_chk' => 'healthRecord', 'immunised_chk' => 'childImmunised', 'prescribed_medicine_chk' => 'prescribedMedicine', 'allergiesArray' => 'addAllergy', 'anaphylaxis_chk' => 'anaphylaxis', 'birth_certificate' => 'birthCertificate', 'asthma_chk' => 'asthma', 'other_health_conditions_chk' => 'healthConditions', 'epipen_chk' => 'epipenOrAnipen', 'relationship' => 'relationToChild', 'work_address' => 'parentWorkAddress', 'work_phone' => 'parentMobile', 'work_email' => 'parentWorkEmailAddress', 'occupation' => 'parentOccupation', 'consent_incursion' => 'authorizedNominieeIncursion', 'consent_make_medical_decision' => 'authNomiColectMedical', 'consent_emergency_contact' => 'consentEmenrgencyContact', 'consent_collect_child' => 'authorizedNominieeColect', 'parent_crn' => 'parentprimaryCarer', 'addition_carer_crn' => 'addtionalprimaryCarer', 'parent_spoken_language' => 'parentSH', 'parent_cultural_background' => 'parentCB', 'parent_aboriginal' => 'parentCB', 'carer_relationship' => 'relationToChild', 'carer_firstname' => 'addtionalFirstname', 'carer_middlename' => 'addtionalmiddlename', 'carer_lastname' => 'addtionallastname', 'carer_dob' => 'addtionaldateOfBirth', 'carer_email' => 'carerEmail', 'carer_address' => 'addtionalAddress', 'carer_suburb' => 'addtionalSuburb', 'carer_country' => 'additionalCarerCountry', 'carer_postalCode' => 'addtionalPC', 'carer_state' => 'addtionalState', 'carer_phone' => 'addtionalPhone', 'carer_mobile' => 'addtionalMobile', 'carer_work_address' => 'addtionalWorkAddress', 'carer_work_phone' => 'addtionalWorkPN', 'carer_work_email' => 'addtionalWorkEmailAddress', 'carer_occupation' => 'addtionalOccupation', 'carer_consent_incursion' => 'AdiAuthNominieeIncursion', 'care_consent_mak_medi_deci' => 'addiAuthNomiColMedi', 'care_consent_eme_contact' => 'AddiAuthorizedNominieeColect', 'carer_consent_collect_child' => 'AddiAuthorizedNominieeColect', 'carer_spoken_language' => 'addtionalSH', 'carer_cultural_background' => 'addtionalCB', 'carer_aboriginal' => 'addtionalStraitIslande', 'emergencyContacts' => 'addEmergencyContact',/*additionals*/
            'emenrgencyContact' => 'emenrgencyContact', 'emAddiAuthNomiColect' => 'emAddiAuthNomiColect', 'emeAddiAuthNomiColMedi' => 'emeAddiAuthNomiColMedi', 'emAdiAuthNominieeIncursion' => 'emAdiAuthNominieeIncursion',/* /additionals*/
            'consent1' => 'consent1', 'consent2' => 'consent2', 'consent3' => 'consent3', 'consent4' => 'consent4', 'consent5' => 'consent5', 'consent6' => 'consent6', 'consent7' => 'consent7', 'consent8' => 'consent8', 'child_bornOrNot' => 'child_bornOrNot', 'priority' => 'priority', 'hearAbout' => 'hearAbout', 'attendance' => 'attendance', 'nappyChange' => 'nappyChange', 'bottleFeed' => 'bottleFeed', 'emNomTranspoSer' => 'emNomTranspoSer', 'emNomKioskApp' => 'emNomKioskApp', 'parentWorkPN' => 'parentWorkPN', 'parentWorkMob' => 'parentWorkMob', 'carer_work_mob' => 'addtionalWorkMN');


        $questionTable = $this->formForObject($form);

        $output = [];
        $isBranchHaveData = false;
        $activeSections = [];
        foreach ($array as $key => $element) {

            $branchElelment = $questionTable::where('branch_id', $branchId)->where('organization_id', $organization_id)->where('input_name', $element)->get()->first();
            if ($branchElelment != null) {
                $output[$key] = array(
                    'question' => $branchElelment['question'],
                    'placeholder' => $branchElelment['input_placeholder'],
                    'required' => $branchElelment['input_mandatory'],
                    'hidden' => $branchElelment['hidden'],
                    'order' => $branchElelment['column_order']
                );
                $isBranchHaveData = true;
                $sec_name = WaitlistEnrolmentSections::find($branchElelment['section_id']);
                $activeSections[$sec_name->section_code] = array(
                    'section_code' => $sec_name->section_code,
                    'section_name' => $sec_name->section_name,
                    'section_order' => $sec_name->section_order,
                );

            } else if (!$isBranchHaveData) {
                $branchElelment = $questionTable::where('organization_id', '=', $organization_id)->where('branch_id', '=', null)->where('input_name', $element)->get()->first();
                if ($branchElelment == null) {
                    $branchElelment = $questionTable::where('branch_id', null)->where('organization_id', null)->where('input_name', $element)->get()->first();
                }
                if ($branchElelment != null) {
                    $output[$key] = array(
                        'question' => $branchElelment['question'],
                        'placeholder' => $branchElelment['input_placeholder'],
                        'required' => $branchElelment['input_mandatory'],
                        'hidden' => $branchElelment['hidden'],
                        'order' => $branchElelment['column_order']
                    );

                    $sec_name = WaitlistEnrolmentSections::find($branchElelment['section_id']);
                    $activeSections[$sec_name->section_code] = array(
                        'section_code' => $sec_name->section_code,
                        'section_name' => $sec_name->section_name,
                        'section_order' => $sec_name->section_order,
                    );
                }
            }
        }

        /* new inputs settings get*/
        $keys = array_column($output, 'order');
        array_multisort($keys, SORT_ASC, $output);
//        \Log::info(print_r($output, true));
//        print_r($output[0]);
        return array_merge($output, array($form . '_sections' => $activeSections));
    }

    /**
     * @param Request $request
     * @return false|\Illuminate\Http\JsonResponse
     */
    public function storeNewInput(Request $request)
    {
        DB::beginTransaction();
        try {
            $validator = Validator::make($request->all(), [
                'type' => ['required'],
                'sectionTitle' => ['required'],
                'sectionCode' => ['required'],
                'question' => ['required'],
                'size' => ['required'],
                'section' => ['required'],
                'required' => ['required'],
                'useInEnrol' => ['required'],
                'useInWait' => ['required'],
                'form' => ['required'], // form setting name required
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
            if ($request->input('section') == 'newSection') {
//                $sectionExists = WaitlistEnrolmentSections::where('section_code', $request['sectionCode']);
////            var_dump($sectionExists->get()->isEmpty());
//                if (!$sectionExists->get()->isEmpty()) {
//                    return response()->json(
//                        RequestHelper::sendResponse(
//                            RequestType::CODE_400,
//                            LocalizationHelper::getTranslatedText('system.resource_exists')
//                        ),
//                        RequestType::CODE_400
//                    );
//                }
                $request['section'] = $this->addSection($request);
            }


            $section_id = Helpers::decodeHashedID($request->input('section'));

            $edit_id = 'new';
            if ($request->input('edit') != null && !empty($request->input('edit'))) {
                $edit_id = Helpers::decodeHashedID($request->input('edit'));
            }

            /* new input filed for need a name and in automatically generate using last row id (future id of current input field)*/

            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

            /*site manager can change all exists  branches and  further own branches for set form template settings( waitlist & enrolment )*/
            /*getting site manager own all branches*/
            $questionTable = $this->formForObject($request['form']);
            $questionTable = $questionTable::where('organization_id', '=', $organization_id);
            $newFieldForAllEnrolments = array();

            if ($branch_id) { // for branch manager
                $organizationForAllBranches = $questionTable->where('branch_id', $branch_id)->groupBy('branch_id')->pluck('branch_id')->toArray();
                $organizationForAllBranches = (!$organizationForAllBranches) ? array($branch_id) : $organizationForAllBranches;
                $newFieldForAllEnrolments = $organizationForAllBranches;
            } else {  // for site manager
                $this->organizationDownLevelBranchesRelateDelete($request['form'], $organization_id);
                $organizationForAllBranches = $questionTable->groupBy('branch_id')->pluck('branch_id')->toArray();
                $organizationForAllBranches = (!$organizationForAllBranches) ? array(null) : $organizationForAllBranches;
                $newFieldForAllEnrolments = WaitlistEnrolmentQuestions::where('organization_id', '=', $organization_id)->groupBy('branch_id')->pluck('branch_id')->toArray();
            }
            unset($questionTable);

            foreach ($organizationForAllBranches as $branch) {

                $questionTable = $this->formForObject($request['form']);

                /*check when update question already exists or not */
//                $relSection = $questionTable::where('branch_id', $branch)->where('organization_id', $organization_id)->where('question', 'LIKE', '"' . $request->input('question') . '"');
//
//                if ($edit_id !== 'new') {
//                    $relSection = $relSection->where('id', '!=', $edit_id);
//                }
//
//                if (!$relSection->get()->isEmpty()) {
//                    return response()->json(
//                        RequestHelper::sendResponse(
//                            RequestType::CODE_400,
//                            LocalizationHelper::getTranslatedText('system.resource_exists')
//                        ),
//                        RequestType::CODE_400
//                    );
//                }

                $length = 10;
                $newInputName = substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length / strlen($x)))), 1, $length) . '_' . ((($questionTable::latest()->first()->id) + 1));

                /*get last order number for relevant section and check relevant branch for questions exists or not*/
                $checkBranchOrOrgData = $questionTable::where('organization_id', '=', $organization_id)->where('branch_id', '=', $branch);

                if ($checkBranchOrOrgData->get()->isEmpty()) {
                    $this->branchForGetCopyOfElements($request['form']);
                    if ($edit_id != 'new') {
                        $newQuestion = $questionTable::find($edit_id);
                        $edit_id = $checkBranchOrOrgData->where('input_name', '=', $newQuestion['input_name'])->get()->first()->toArray()['id'];
                    }
                }

                /*get default section code for relevant section - common data with filter next data*/
                $sectionCode = WaitlistEnrolmentSections::find($section_id)['section_code'];
                $oldSectionID = $section_id;

                $section_id = WaitlistEnrolmentSections::with('questions_' . $request['form'])
                    ->whereHas('questions_' . $request['form'], function ($query) use ($branch, $organization_id) {
                        $query->where('branch_id', $branch)->where('organization_id', $organization_id);
                    })->where('section_code', $sectionCode);

                $section_id = (!$section_id->get()->isEmpty()) ? $section_id->first()->toArray()['id'] : $oldSectionID;

                /* get last column order and increment */
                $relSection = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($branch, $organization_id) {
                    $query->where('branch_id', $branch)->where('organization_id', $organization_id)->orderBy('column_order');
                }])->where('id', $section_id)->first()->toArray();

                /*column oderder get with selction last question incrimental order*/
                $columnOrder = isset($relSection['questions_' . $request['form']][count($relSection['questions_' . $request['form']]) - 1]) ? $relSection['questions_' . $request['form']][count($relSection['questions_' . $request['form']]) - 1]['column_order'] + 1 : 1;

                /*select dropdown for options*/
                $options = (count($request->input('selectOptions')) > 0) ? $request->input('selectOptions') : [];

                $options = array_merge($options, array(
                    'multiple' => $request->input('multiple'),
                    'hyperlink' => $request->input('hyperlink'),
                    'fileUploadRequired' => $request->input('fileUploadRequired'),
                ));

                if ($request->filled('WaitlistForSection.section_index')) {
                    $options = array_merge($options, array(
                        'useInWait' => $request->input('useInWait'),
                        'WaitlistForSection' => $request->input('WaitlistForSection.section_code'),
                    ));
                }

                if ($request->filled('EnrolForSection.section_index')) {
                    $options = array_merge($options, array(
                        'useInEnrol' => $request->input('useInEnrol'),
                        'EnrolForSection' => $request->input('EnrolForSection.section_code'),
                    ));
                }

                /*elemet size for value assign*/
                switch ($request->input('size')):
                    case 'small' :/* 1/3 */
                        $size = '33';
                        break;
                    case 'medium' : /* 1/2 */
                        $size = '50';
                        break;
                    case 'large' : /* 1 */
                        $size = '100';
                        break;
                    default: /* 2/3 */
                        $size = '66';
                endswitch;

                $inputMandatoryChangeable = 0;
                $status = 'new';
                $optionsData = array();
                if ($edit_id != 'new') {
                    $newQuestion = $questionTable::find($edit_id);
                    $newQuestion->hidden = ($request->input('hidden')) ? 0 : 1;
                    $newInputName = $newQuestion['input_name'];
                    $inputMandatoryChangeable = $newQuestion['input_mandatory_changeable'];
                    $status = $newQuestion['status'];

                    $types = $newQuestion['types'];

                    /* check whether previously have use or not fields multiple use */
                    if ((isset($options['useInWait']) && $options['useInWait']) || (isset($options['useInEnrol']) && $options['useInEnrol']) || (isset($types->useInWait) && $types->useInWait) || (isset($types->useInEnrol) && $types->useInEnrol)) {
                        $optionsData['latest'] = $options;
                        $optionsData['previous'] = json_decode(json_encode($types), true);
                    }

                } else {
                    $newQuestion = $this->formForObject($request['form']);
                    $newQuestion->column_order = $columnOrder;
                    $newQuestion->hidden = 1;
                }


                if (!$request->filled('WaitlistForSection.section_index')) {
                    $options = array_merge($options, array(
                        'useInWait' => isset($types->useInWait) ? $types->useInWait : false,
                        'WaitlistForSection' => isset($types->useInWait) ? $types->WaitlistForSection : '',
                    ));
                }

                if (!$request->filled('EnrolForSection.section_index')) {
                    $options = array_merge($options, array(
                        'useInEnrol' => isset($types->useInEnrol) ? $types->useInEnrol : false,
                        'EnrolForSection' => isset($types->useInEnrol) ? $types->EnrolForSection : '',
                    ));
                }

                /* this handle which form for show new  element*/
                $access_for = 'enrolment';
                $enqForTypes = '';
                $access_for_forms_all = array();
                if (($request->input('form') == 'waitlist' || $request->input('form') == 'enquiry') && $request->input('EnrolForSection')) {
                    $access_for = 'both';
                    $access_for_forms_all = array_merge($access_for_forms_all, array('enrolment'));
                } elseif ($request->input('form') == 'waitlist' && !$request->input('EnrolForSection')) {
                    $access_for = 'waitlist';
                } elseif ($request->input('form') == 'enquiry' && (!$request->input('EnrolForSection') && !$request->input('WaitlistForSection'))) {
                    $access_for = 'enquiry';
                }

                /* enquiry for waitlist = forms for man new fields - check */

                if ($request->input('form') == 'enquiry' && $request->input('WaitlistForSection')) {
                    $access_for_forms_all = is_array($access_for_forms_all) && count($access_for_forms_all) > 0 ? array_merge($access_for_forms_all, array('waitlist')) : array('waitlist');;
                }

                if ($request->input('form') == 'enquiry' && is_array($access_for_forms_all)) {
                    if (count($access_for_forms_all) == 2) {
                        $enqForTypes = 'triple';
                    } else if (count($access_for_forms_all) == 1) {
                        if (in_array('enrolment', $access_for_forms_all)) {
                            $enqForTypes = 'enq-enr';
                        } else {
                            $enqForTypes = 'enq-wait';
                        }
                    }
                }

                $newQuestion->organization_id = $organization_id;
                $newQuestion->branch_id = $branch;
                $newQuestion->section_id = $section_id;
                $newQuestion->input_type = ('select' == $request->input('type') && false !== $request->input('multiple')) ? 'select-multiple' : $request->input('type');
                $newQuestion->question = $request->input('question');
                $newQuestion->input_placeholder = $request->input('placeholder');
                $newQuestion->input_required = $newInputName . 'R';
                $newQuestion->input_name = $newInputName;
                $newQuestion->input_hiddenfield_name = $newInputName . 'H';
                $newQuestion->input_placeholder_name = $newInputName . 'P';
                $newQuestion->input_mandatory = ($request->input('required')) ? 0 : 1;
                $newQuestion->input_mandatory_changeable = $inputMandatoryChangeable;
                $newQuestion->types = json_encode((count($options) > 0) ? $options : '');
                $newQuestion->column_width = 60;
                $newQuestion->column_height = $size;
                if ($edit_id == 'new') {
                    $newQuestion->access_for = $request->input('form') == 'enquiry' && is_array($access_for_forms_all) && count($access_for_forms_all) > 0 ? $enqForTypes : $access_for;
                }
                $newQuestion->status = $status;


                $newQuestion->save();


                /* emergency contact section add new button set for last in queue */
                if ($sectionCode == 'emergency_contact_details') {
                    WaitlistEnrolmentQuestions::where('organization_id', $organization_id)->where('branch_id', $branch)->where('input_name', 'addEmergencyContact')->update(['column_order' => ((int)$columnOrder + 1)]);
                }

                if ($optionsData) {
                    $this->fieldOptionsChangeWithMappedAllChanges($request, $optionsData, $newQuestion);
                }

            }

            foreach ($newFieldForAllEnrolments as $branch) {
                /*by the waitlist form if add a new input transfer with enrollment*/
                if (($request->input('form') == 'waitlist' || $request->input('form') == 'enquiry') && ($request->input('useInEnrol') || $request->input('useInWait')) && $edit_id == 'new') {

                    /*check when update question already exists or not */

//                    $relSection = WaitlistEnrolmentQuestions::where('branch_id', $branch)->where('organization_id', $organization_id)->where('question', 'LIKE', '"' . $request->input('question') . '"')->get();
//
//                    if (!$relSection->isEmpty()) {
//                        return response()->json(
//                            RequestHelper::sendResponse(
//                                RequestType::CODE_400,
//                                LocalizationHelper::getTranslatedText('system.resource_exists')
//                            ),
//                            RequestType::CODE_400
//                        );
//                    }

                    foreach ($access_for_forms_all as $form) {
                        $questionTable = $this->formForObject($form);
                        if ($questionTable::where('branch_id', $branch)->where('organization_id', $organization_id)->get()->isEmpty()) {
                            if (!$this->branchForGetCopyOfElements($form)) {
                                return false;
                            }
                        }
                        unset($questionTable);
                        /*column order and section id set*/
                        $secId = WaitlistEnrolmentSections::whereHas('questions_' . $form, function ($query) use ($branch, $organization_id) {
                            $query->where('branch_id', '=', $branch)->where('organization_id', $organization_id);
                        })->where('section_code', $form == 'enrolment' ? $request->input('EnrolForSection.section_code') : $request->input('WaitlistForSection.section_code'))->first()['id'];

                        $questionTable = $this->formForObject($form);
                        $relSection = $questionTable::where('section_id', $secId)->orderBy('column_order')->get()->toArray();
                        unset($questionTable);

                        $accType = 'both';
                        if ($request->input('form') == 'enquiry') {
                            if ('enrolment' == $form) {
                                $accType = 'enq-enr';
                            } else if ('waitlist' == $form) {
                                $accType = 'enq-wait';
                            }
                        }

                        $transferQuestion = $this->formForObject($form);
                        $transferQuestion->column_order = $relSection[count($relSection) - 1]['column_order'] + 1;
                        $transferQuestion->hidden = 1;
                        $transferQuestion->organization_id = $organization_id;
                        $transferQuestion->branch_id = $branch;
                        $transferQuestion->section_id = $secId;
                        $transferQuestion->input_type = ('select' == $request->input('type') && false !== $request->input('multiple')) ? 'select-multiple' : $request->input('type');
                        $transferQuestion->question = $request->input('question');
                        $transferQuestion->input_placeholder = $request->input('placeholder');
                        $transferQuestion->input_required = $newInputName . 'R';
                        $transferQuestion->input_name = $newInputName;
                        $transferQuestion->input_hiddenfield_name = $newInputName . 'H';
                        $transferQuestion->input_placeholder_name = $newInputName . 'P';
                        $transferQuestion->input_mandatory = ($request->input('required')) ? 0 : 1;
                        $transferQuestion->input_mandatory_changeable = $inputMandatoryChangeable;
                        $transferQuestion->types = json_encode((count($options) > 0) ? $options : '');
                        $transferQuestion->column_width = 60;
                        $transferQuestion->column_height = $size;
                        $transferQuestion->access_for = $accType;
                        $transferQuestion->status = $status;
                        $transferQuestion->save();

                        /* emergency contact section add new button set for last in queue */
                        if ($sectionCode == 'emergency_contact_details') {
                            WaitlistEnrolmentQuestions::where('organization_id', $organization_id)->where('branch_id', $branch)->where('input_name', 'addEmergencyContact')->update(['column_order' => ((int)$transferQuestion->column_order + 1)]);
                        }
                    }

                }
            }
            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
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

    public function fieldOptionsChangeWithMappedAllChanges($request, $optionsData, $newQuestion)
    {
        $question = $this->formForObject($request['form'])::find(Helpers::decodeHashedID($request->input('edit')));

        /* for waitlist */
        if (((isset($optionsData['previous']['useInWait']) && $optionsData['previous']['useInWait']) || (isset($optionsData['latest']['useInWait']) && $optionsData['latest']['useInWait'])) && $request->filled('WaitlistForSection.section_index')) {

            if ($optionsData['latest']['useInWait']) {

                $section = WaitlistQuestions::where('section_id', Helpers::decodeHashedID($request->input('WaitlistForSection.section_index')))->orderBy('column_order', 'DESC')->get()->first()->toArray();

                WaitlistQuestions::updateOrCreate(
                    ['input_name' => $question->input_name],
                    [
                        'section_id' => Helpers::decodeHashedID($request->input('WaitlistForSection.section_index')),
                        'column_order' => ((isset($optionsData['previous']['WaitlistForSection']) && isset($optionsData['latest']['WaitlistForSection'])) && $optionsData['previous']['WaitlistForSection'] === $optionsData['latest']['WaitlistForSection']) ? (int)$section['column_order'] : (int)$section['column_order'] + 1,
                        'input_type' => $newQuestion->input_type,
                        'question' => $newQuestion->question,
                        'input_placeholder' => $newQuestion->input_placeholder,
                        'input_mandatory' => $newQuestion->input_mandatory,
                        'input_required' => $newQuestion->input_required,
                        'input_hiddenfield_name' => $newQuestion->input_hiddenfield_name,
                        'input_mandatory_changeable' => $newQuestion->input_mandatory_changeable,
                        'input_placeholder_name' => $newQuestion->input_placeholder_name,
                        'types' => json_encode($newQuestion->types),
                        'column_height' => $newQuestion->column_height,
                        'status' => $newQuestion->status,
                        'hidden' => $newQuestion->hidden,
                        'column_width' => $newQuestion->column_width,
                        'organization_id' => $section['organization_id'],
                        'branch_id' => $section['branch_id'],
                        'access_for' => $request->input('form') == 'enquiry' ? 'enq-wait' : 'both',
                    ]
                );

            } else if ($optionsData['previous']['useInWait'] && !$optionsData['latest']['useInWait']) {
                $waitlist = WaitlistQuestions::where('input_name', $question->input_name)->first();
                WaitlistQuestions::find($waitlist->id)->delete();
            }

        }

        /* for enrolment*/
        if (((isset($optionsData['previous']['useInEnrol']) && $optionsData['previous']['useInEnrol']) || (isset($optionsData['latest']['useInEnrol']) && $optionsData['latest']['useInEnrol'])) && $request->filled('EnrolForSection.section_index')) {

            if ($optionsData['latest']['useInEnrol']) {

                $section = WaitlistEnrolmentQuestions::where('section_id', Helpers::decodeHashedID($request->input('EnrolForSection.section_index')))->orderBy('column_order', 'DESC')->get()->first()->toArray();

                WaitlistEnrolmentQuestions::updateOrCreate(
                    ['input_name' => $question->input_name],
                    [
                        'section_id' => Helpers::decodeHashedID($request->input('EnrolForSection.section_index')),
                        'column_order' => ((isset($optionsData['previous']['EnrolForSection']) && isset($optionsData['latest']['EnrolForSection'])) && $optionsData['previous']['EnrolForSection'] === $optionsData['latest']['EnrolForSection']) ? (int)$section['column_order'] : (int)$section['column_order'] + 1,
                        'input_type' => $newQuestion->input_type,
                        'question' => $newQuestion->question,
                        'input_placeholder' => $newQuestion->input_placeholder,
                        'input_mandatory' => $newQuestion->input_mandatory,
                        'input_required' => $newQuestion->input_required,
                        'input_hiddenfield_name' => $newQuestion->input_hiddenfield_name,
                        'input_mandatory_changeable' => $newQuestion->input_mandatory_changeable,
                        'input_placeholder_name' => $newQuestion->input_placeholder_name,
                        'types' => json_encode($newQuestion->types),
                        'column_height' => $newQuestion->column_height,
                        'status' => $newQuestion->status,
                        'hidden' => $newQuestion->hidden,
                        'column_width' => $newQuestion->column_width,
                        'organization_id' => $section['organization_id'],
                        'branch_id' => $section['branch_id'],
                        'access_for' => $request->input('form') == 'enquiry' ? 'enq-enr' : 'both',
                    ]
                );

            } else if ($optionsData['previous']['useInEnrol'] && !$optionsData['latest']['useInEnrol']) {
                $waitlist = WaitlistEnrolmentQuestions::where('input_name', $question->input_name)->first();
                WaitlistEnrolmentQuestions::find($waitlist->id)->delete();
            }

        }

    }

    /**
     * @param $form
     * @return false|\Illuminate\Http\JsonResponse
     */
    public function branchForGetCopyOfElements($form)
    {
        DB::beginTransaction();
        try {
            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;
//            $defaultSectionsIDs = array(1, 2, 3, 4, 5, 6, 7, 8);

            $questionTable = $this->formForObject($form);

            $orgActive = true; // organize wise search
//            whereIn('section_id', $defaultSectionsIDs)->
            $defaultSections = $questionTable::where('organization_id', '=', $organization_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
            if (!$defaultSections) {
                $defaultSections = $questionTable::where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                $orgActive = false;
            }
            unset($questionTable);

            $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $form => function ($query) use ($form, $orgActive, $organization_id) {
                $query->where('branch_id', '=', null);
                (!$orgActive) ? $query->where('organization_id', '=', null) : $query->where('organization_id', '=', $organization_id);
                $query->orderBy('column_order');
            }])->whereIn('id', $defaultSections)->orderBy('id')->get();


            if ($branchTemplateElements->isEmpty()) {
                return false;
            }


            foreach ($branchTemplateElements->toArray() as $branch) {
                $newSection = new WaitlistEnrolmentSections();
                $newSection->section_name = $branch['section_name'];
                $newSection->section_code = $branch['section_code'];
                $newSection->mandatory = $branch['mandatory'];
                $newSection->section_position_static = $branch['section_position_static'];
                $newSection->section_order = $branch['section_order'];
                $newSection->hide_status = $branch['hide_status'];
                $newSection->save();

                foreach ($branch['questions_' . $form] as $question) {

                    $newQuestion = $this->formForObject($form);

                    $newQuestion->organization_id = $organization_id;
                    $newQuestion->branch_id = $branch_id;
                    $newQuestion->input_type = $question['input_type'];
                    $newQuestion->question = $question['question'];
                    $newQuestion->input_placeholder = $question['input_placeholder'];
                    $newQuestion->input_required = $question['input_required'];
                    $newQuestion->input_name = $question['input_name'];
                    $newQuestion->hidden = $question['hidden'];
                    $newQuestion->input_hiddenfield_name = $question['input_hiddenfield_name'];
                    $newQuestion->input_placeholder_name = $question['input_placeholder_name'];
                    $newQuestion->input_mandatory = $question['input_mandatory'];
                    $newQuestion->input_mandatory_changeable = $question['input_mandatory_changeable'];
                    $newQuestion->types = json_encode($question['types']);
                    $newQuestion->column_width = $question['column_width'];
                    $newQuestion->column_height = $question['column_height'];
                    $newQuestion->column_order = $question['column_order'];
                    $newQuestion->status = $question['status'];
                    $newQuestion->access_for = $question['access_for'];
                    if ($form == 'waitlist') {
                        $newSection->questions_waitlist()->save($newQuestion);
                    } else if ($form == 'enquiry') {
                        $newSection->questions_enquiry()->save($newQuestion);
                    } else {
                        $newSection->questions_enrolment()->save($newQuestion);
                    }

                }

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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getBranchList(Request $request)
    {

        try {

            $branches = $this->branchRepo->findByOrg((string)Helpers::decodeHashedID($request->input('orgId')), ['status' => '0'], false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BranchResourceCollection($branches)
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    /**
     * @return \Illuminate\Http\JsonResponse
     */
    public function getBranchListForSiteManager()
    {
        try {
            $branches = [];

            if (auth()->user()->hasOwnerAccess()) {
                $branches = $this->branchRepo->findByOrg(auth()->user()->organization_id, ['status' => '0'], false);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BranchResourceCollection($branches)
                ), RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|string
     */
    public function getOrgInfo(Request $request)
    {
        try {

            if (auth()->user()->hasOwnerAccess()) {
                $id = auth()->user()->organization_id;
            } else {
                $id = Helpers::decodeHashedID($request->input('id'));
            }

            $rowObj = Organization::find($id);

            if (is_null($rowObj)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            return (new OrganizationResource($rowObj, ['getSubInfo' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {

            ErrorHandler::log($e);

            return $e->getMessage();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }

    }

    /**
     * @param Request $request
     * @return array|string|string[]
     */
    public function addSection(Request $request)
    {
        $lastOrderNu = WaitlistEnrolmentSections::whereIn('id', $this->userForRelevantSections($request))->orderBy('section_order', 'DESC')->pluck('section_order')->first();

        $newSection = new WaitlistEnrolmentSections();
        $newSection->section_name = $request['sectionTitle'];
        $newSection->section_code = $request['sectionCode'];
        $newSection->mandatory = 0;
        $newSection->section_position_static = 0;
        $newSection->section_order = ($lastOrderNu + 1);
        $newSection->hide_status = 1;
        $newSection->save();
        return Helpers::hxCode($newSection->id);
    }

    /**
     * @param $request
     * @return array
     */
    public function userForRelevantSections($request)
    {
        $org_id = auth()->user()->organization_id;
        $branch_id = auth()->user()->branch_id;

        $questionTable = $this->formForObject($request['form']);

        $branchTemplateElements = $questionTable::where('branch_id', '=', $branch_id)->where('organization_id', '=', $org_id)->get();


        if ($branchTemplateElements->isEmpty()) {
            $defaultSections = array(1, 2, 3, 4, 5, 6, 7, 8);
            $sections = $questionTable::where('organization_id', '=', $org_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
            if (!$sections) {
                $sections = $questionTable::whereIn('section_id', $defaultSections)->where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
            }
        } else {
            $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', $org_id)->where('branch_id', $branch_id)->groupBy('section_id')->pluck('section_id')->toArray();
        }
        return $sections;
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function editSectionName(Request $request): \Illuminate\Http\JsonResponse
    {
        try {

            $validator = Validator::make($request->all(), [
                'form' => ['required'], // form setting name required
                'section_id' => ['required'],
                'value' => ['required'],
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


            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;
            $section_id = Helpers::decodeHashedID($request->section_id);
            if ($this->formForObject($request['form'])::where('branch_id', $branch_id)->where('organization_id', $organization_id)->get()->isEmpty()) {

                $this->branchForGetCopyOfElements($request['form']);

                $sectionCode = WaitlistEnrolmentSections::find($section_id)['section_code'];
                $section_id = WaitlistEnrolmentSections::with('questions_' . $request['form'])
                    ->whereHas('questions_' . $request['form'], function ($query) use ($branch_id, $organization_id) {
                        $query->where('branch_id', $branch_id)->where('organization_id', $organization_id);
                    })->where('section_code', $sectionCode);
                $section_id = (!$section_id->get()->isEmpty()) ? $section_id->first()->toArray()['id'] : null;
            }
            $section = WaitlistEnrolmentSections::find($section_id);

            if (is_null($section)) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('system.resource_not_found')
                    ),
                    RequestType::CODE_404
                );
            }

            $section->section_name = $request->value;
            $section->save();
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteInputField(Request $request)
    {
        try {

            $validator = Validator::make($request->all(), [
                'input_id' => ['required'],
                'form' => ['required'],
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

            $questionTable = $this->formForObject($request['form']);

            $inputField = $questionTable::find(Helpers::decodeHashedID($request->input_id));

            $delete = true;

            /* cannot delete default fields */
            if (is_null($inputField->branch_id) && is_null($inputField->organization_id)) {
                $delete = false;
            }

            /* cannot delete site manager details except site manager*/
            if ($delete && auth()->user()->hasOwnerAccess()) {
                $orgId = auth()->user()->organization_id;
                if ($orgId != $inputField->organization_id || !is_null($inputField->branch_id)) {
                    $delete = false;
                }
            }

            /* cannot delete branch manager details except branch manager only owns */
            if ($delete && auth()->user()->isBranchUser() && (is_null($inputField->organization_id) || is_null($inputField->branch_id))) {
                $delete = false;
            }

            if (!$delete) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.default_settings_delete_unauthorized')
                    ),
                    RequestType::CODE_400
                );
            }

            $inputField->delete();

            /*site manager settings applying*/
            if (auth()->user()->hasOwnerAccess()) {
                $this->organizationDownLevelBranchesRelateDelete($request['form'], $orgId);
            }
            $this->sectionFieldsOrdering($inputField, $request);


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_201
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

    public function sectionFieldsOrdering($inputField, $request)
    {
        $sectionData = $this->formForObject($request['form'])::where('section_id', $inputField->section_id)->where('branch_id', $inputField->branch_id)->where('organization_id', $inputField->organization_id)->orderBy('column_order', 'ASC')->get()->toArray();
        foreach ($sectionData as $key => $field) {
            $this->formForObject($request['form'])->where('id', $field['id'])->update(['column_order' => (int)$key + 1]);
        }

    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteSection(Request $request)
    {
        try {

            $validator = Validator::make($request->all(), [
                'section_id' => ['required'],
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

            $branch_id = null;
            $organization_id = null;
            $delete = true;

            $secQuestion = WaitlistEnrolmentQuestions::where('section_id', Helpers::decodeHashedID($request->section_id))->get();
            if (!$secQuestion->isEmpty()) {
                $branch_id = $secQuestion->first()['branch_id'];
                $organization_id = $secQuestion->first()['organization_id'];
            }

            $secQuestion = WaitlistQuestions::where('section_id', Helpers::decodeHashedID($request->section_id))->get();
            if (!$secQuestion->isEmpty()) {
                $branch_id = $secQuestion->first()['branch_id'];
                $organization_id = $secQuestion->first()['organization_id'];
            }

            $secQuestion = WaitlistEnquiryQuestions::where('section_id', Helpers::decodeHashedID($request->section_id))->get();
            if (!$secQuestion->isEmpty()) {
                $branch_id = $secQuestion->first()['branch_id'];
                $organization_id = $secQuestion->first()['organization_id'];
            }

            /* cannot delete default fields */
            if ($delete && is_null($branch_id) && is_null($organization_id)) {
                $delete = false;
            }

            /* cannot delete site manager details except site manager*/
            if ($delete && auth()->user()->hasOwnerAccess() && !is_null($organization_id)) {
                if ($organization_id != auth()->user()->organization_id || !is_null($branch_id)) {
                    $delete = false;
                }
            }

            /* cannot delete branch manager details except branch manager only owns */
            if ($delete && auth()->user()->isBranchUser() && (is_null($organization_id) || is_null($branch_id))) {
                $delete = false;
            }

            $section = WaitlistEnrolmentSections::find(Helpers::decodeHashedID($request->section_id));

            if ($delete) {
                $section->forceDelete();
            } else {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.error_process')
                    ),
                    RequestType::CODE_400
                );
            }


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_201
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getNote(Request $request)
    {
        try {
            $id = Helpers::decodeHashedID($request->wait_enrol_id);// can be waitlist_enrolment table primary key or enquiry table PK
            if (in_array($request->status, [5, 6])) {
                $enquiryRow = Enquiries::find(Helpers::decodeHashedID($request->wait_enrol_id));
                $id = $enquiryRow->enquiry_info['waitlist_enrolment_id'] ?? Helpers::decodeHashedID($request->wait_enrol_id); // primary key of the waitlist enrolment table which created using enquiry
            }

            $note = WaitlistEnrolmentNotes::where('enquiry_waitlist_enrolment_id', $id);
//            $note = in_array($request->status, [5, 6]) ? $note->whereIn('type', [0]) : $note->whereIn('type', [1, 2]);
            $note = $note->orderBy('updated_at', 'DESC')->get();

            return (new WaitlistNoteResourceCollection($note))
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveNote(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'edit' => ['required'],
                'note' => ['required'],
                'status' => ['required'],
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

            $note = ($request['edit']) ? WaitlistEnrolmentNotes::find(Helpers::decodeHashedID($request['note_index'])) : new WaitlistEnrolmentNotes();


            if (in_array($request['status'], [5, 6])) {
                $id = Helpers::decodeHashedID($request['wait_enrol_id']);
                $enquiryRow = Enquiries::find($id);
                $id = isset($enquiryRow->enquiry_info['waitlist_enrolment_id']) ? $enquiryRow->enquiry_info['waitlist_enrolment_id'] : Helpers::decodeHashedID($request->wait_enrol_id); // primary key of the waitlist enrolment table which created using enquiry
                $note->type = isset($enquiryRow->enquiry_info['waitlist_enrolment_id']) ? 1 : 0;
            } else {
                $note->type = $request['status'] == 2 ? 2 : 1;
            }
            $note->enquiry_waitlist_enrolment_id = $request['wait_enrol_id'] == '' ? null : Helpers::decodeHashedID($request['wait_enrol_id']);
            $note->note = $request['note'];
            $note->child_id = $request['child_id'] == '' ? null : Helpers::decodeHashedID($request['child_id']);
            ($request['edit']) ? $note->updated_by = auth()->user()->id : $note->created_by = auth()->user()->id;
            $note->save();

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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteNote(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'note_index' => ['required'],
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
            $delete = WaitlistEnrolmentNotes::find(Helpers::decodeHashedID($request['note_index']));
            $delete->delete();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_201
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function crmBranchChange(Request $request)
    {
        try {
            if ($request['form'] == 'enquiry') {
                $current = Enquiries::find(Helpers::decodeHashedID($request['currentPKey']));
                if ($current) {
                    $next = Enquiries::where('branch_id', Helpers::decodeHashedID($request['branchId']));
                    $next = $next->whereLike('enquiry_info->email', $current['enquiry_info']['email'])->where('branch_id', '!=', $current['branch_id'])->get();
                }
            } else {
                $current = WaitListEnrollment::find(Helpers::decodeHashedID($request['currentPKey']));
                if ($current) {
                    $next = WaitListEnrollment::where('branch_id', Helpers::decodeHashedID($request['branchId']));
                    $next = $next->whereLike('waitlist_info->email', $current['waitlist_info']['email'])->where('branch_id', '!=', $current['branch_id'])->get();
                }
            }

            if ($request['emailTrack'] && !$next->isEmpty()) {
                return $this->sameEmailUseForBranch();
            }

            if ($request['form'] == 'enquiry') {
                Enquiries::where('id', Helpers::decodeHashedID($request['currentPKey']))->update(['branch_id' => Helpers::decodeHashedID($request['branchId'])]);
            } else {
                WaitListEnrollment::where('id', Helpers::decodeHashedID($request['currentPKey']))->update(['branch_id' => Helpers::decodeHashedID($request['branchId'])]);
            }
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
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

    public function testGet()
    {
        $waitlistObj = Enquiries::with('branch')->where('id', '=', 105);
        $waitlistObj = $waitlistObj->paginate(5);
        return (new EnquiryResourceCollection($waitlistObj))
            ->additional([
                'totalRecords' => 1,
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function waitlistSettings(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'form' => ['required'],
                'waitlist_id' => ['required'],
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

            $waitlist = $request['form'] == 'enquiry' ? Enquiries::findOrFail(Helpers::decodeHashedID($request->input('waitlist_id'))) : WaitListEnrollment::findOrFail(Helpers::decodeHashedID($request->input('waitlist_id')));
            Log::info(Helpers::decodeHashedID($request->input('waitlist_id')));
            $branchId = $waitlist->branch_id;
            $organization_id = $waitlist->organization_id;

            $request['form'] = $request['form'] == 'enquiry' ? 'waitlist' : 'enrolment';

            $questionTable = $this->formForObject($request['form']);
            $branchTemplateElements = $questionTable::where('branch_id', '=', $branchId)->where('organization_id', '=', $organization_id)->get();

            if ($branchTemplateElements->isEmpty()) {
                $orgActive = true; // organize wise search
                $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', $organization_id)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                if (!$sections) {
                    $sections = $questionTable::whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])->where('organization_id', '=', null)->where('branch_id', '=', null)->groupBy('section_id')->pluck('section_id')->toArray();
                    $orgActive = false;
                }

                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($organization_id, $request, $orgActive) {
                    $query->whereIn('access_for', ['both', 'enq-enr', 'enq-wait', 'triple', $request['form']])
                        ->where('branch_id', '=', null)->where('hidden', '=', '1');
                    (!$orgActive) ? $query->where('organization_id', '=', null) : $query->where('organization_id', '=', $organization_id);
                    $query->orderBy('column_order');
                }])->where('hide_status', '=', '1')->whereIn('id', $sections)->orderBy('section_order')->get();

            } else {
                $sections = $questionTable::where('branch_id', $branchId)->where('organization_id', $organization_id)->where('hidden', '1')->groupBy('section_id')->pluck('section_id')->toArray();
                $branchTemplateElements = WaitlistEnrolmentSections::with(['questions_' . $request['form'] => function ($query) use ($branchId, $organization_id) {
                    $query->where('hidden', '=', '1')->where('organization_id', $organization_id)->where('branch_id', '=', $branchId)->orderBy('column_order')->orderBy('id');
                }])->where('hide_status', '=', '1')->whereIn('id', $sections)->orderBy('section_order')->get();
            }

            return (new EnrolmentMasterCollection($branchTemplateElements))
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
