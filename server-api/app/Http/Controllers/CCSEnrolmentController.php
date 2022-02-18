<?php

namespace Kinderm8\Http\Controllers;

use Carbon\CarbonPeriod;
use DateTimeHelper;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse as JsonResponseAlias;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\SnsActionType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Carbon\Carbon;
use CCSHelpers;
use DB;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Http\Requests\CCSEnrolmentCloseRequest;
use Kinderm8\Http\Requests\CCSEnrolmentReadRequest;
use Kinderm8\Http\Requests\CCSEnrolmentSaveRequest;
use Kinderm8\Http\Requests\CCSEnrolmentSubmitRequest;
use Kinderm8\Http\Requests\CCSEnrolmentVerifyRequest;
use Kinderm8\Http\Requests\CRNStoreRequest;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\CCSEnrolmentResource;
use Kinderm8\Http\Resources\CCSEnrolmentResourceCollection;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Notifications\ParentEnrolmentConfirmationMail;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use Nahid\JsonQ\Jsonq;
use PathHelper;
use RequestHelper;
use function _\upperCase;

class CCSEnrolmentController extends Controller
{
    private $enrolmentRepo;
    private $childRepo;
    private $bookingRepo;
    private $userRepo;
    private $feeRepo;

    private $snsService;

    public function __construct(ICCSEnrolmentRepository $enrolmentRepo, IChildRepository $childRepo, IBookingRepository $bookingRepo, IUserRepository $userRepo, IFeeRepository $feeRepo, SNSContract $snsService)
    {
        $this->enrolmentRepo = $enrolmentRepo;
        $this->childRepo = $childRepo;
        $this->bookingRepo = $bookingRepo;
        $this->userRepo = $userRepo;
        $this->feeRepo = $feeRepo;
        $this->snsService = $snsService;
    }

    /**
     * get child enrolment
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function get(Request $request)
    {
        try
        {
            $rowObj = $this->childRepo->findById(
                Helpers::decodeHashedID($request->input('index')),
                ['ccs_enrolment', 'ccs_enrolment.child', 'ccs_enrolment.parent', 'ccs_enrolment.creator']
            );

            /*-------------------------------------------------*/

            /*if(!is_null($rowObj->ccs_enrolment) && $rowObj->ccs_enrolment->is_synced === '1')
            {
                $client = new Client(
                    [
                        'headers' => [
                            'x-api-key' => config('aws.api_key'),
                            'ccsserviceid' => '190012455K', // $rowObj->ccs_enrolment->service_id
                            'ccsenrolmentid' => 'E8000084121', // $rowObj->ccs_enrolment->enrolment_id
                            'authpersonid' => '0110460024', // $rowObj->creator->ccs_id
                        ],
                    ]);

                $response = $client->get(Helpers::getConfig('enrolment.read', AWSConfigType::API_GATEWAY));

                $body = json_decode((string) $response->getBody(), true);

                \Log::error($body);
            }*/

            /*-------------------------------------------------*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ChildResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * set child/individual crn
     * @param Request $request
     * @return JsonResponseAlias
     * @throws Exception
     */
    public function setCRN(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CRNStoreRequest::class);

            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
            $value = (! Helpers::IsNullOrEmpty($request->input('crn'))) ? $request->input('crn') : null;

            //child
            if($type === 'crn0' && auth()->user()->can(['child-create', 'child-edit']))
            {
                $this->childRepo->setCRN(Helpers::decodeHashedID($request->input('id')), $value);
            }
            //parent
            else if($type === 'crn1' && auth()->user()->can(['user-create', 'user-edit']))
            {
                $this->userRepo->setCRN(Helpers::decodeHashedID($request->input('id')), $value);
            }
            else
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.value_not_found')
                    ), RequestType::CODE_400);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * Get enrolment related data
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            // check can create enrolment
            $skip = (! Helpers::IsNullOrEmpty($request->input('skip'))) ? $request->input('skip') : null;

            $rowObj = $this->childRepo
                ->with(['ccs_enrolment'])
                ->find(Helpers::decodeHashedID($request->input('index')));

            if ($skip === '1' && count($rowObj->ccs_enrolment) > 0 && !in_array($rowObj->ccs_enrolment[0]->status, ['NOTAPP', 'REJECT', 'WITHDR', 'CEASED']))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.can_not_create_enrolment')
                ), RequestType::CODE_404);
            }

            //get fees
            $fees = $this->feeRepo->get([
                'status' => '0'
            ], ['adjusted_past_collection'], $request, false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'fees' => new FeesResourceCollection($fees, [ 'adjusted_past_future' => true ]),
                        'arrangement_types' => CCSType::ENROLMENT_ARRANGEMENT_TYPE,
                        'reason_for_pea' => CCSType::ENROLMENT_PEA_REASON
                    ]
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get enrolment bookings
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function getEnrolmentBookings(Request $request)
    {
        try
        {
            $id = Helpers::decodeHashedID($request->input('index'));
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
            $start_date = (! Helpers::IsNullOrEmpty($request->input('date'))) ? $request->input('date') : null;
            $end_date = Carbon::parse($start_date)->addDays($type === '0' ? 6 : 13);

            // get child
            $rowObj = $this->childRepo->find($id);

            // get bookings
            $bookings = $this->bookingRepo
                ->with(['room', 'fee'])
                ->where('child_id', $rowObj->id)
                ->where('is_casual', false)
                ->whereIn('status', ['0', '1'])
                ->whereBetween('date', [$start_date, $end_date])
                ->orderBy('date', 'ASC')
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingResourceCollection($bookings)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Store enrolment object
     * @param Request $request
     * @return JsonResponseAlias
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentSaveRequest::class);

            $authUser = $this->userRepo
                ->with(['branch', 'branch.providerService'])
                ->find(auth()->user()->id);

            if(is_null($authUser->ccs_id))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found')
                ), RequestType::CODE_404);
            }

            if(is_null($authUser->branch->providerService))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('enrolment.service_provider_not_found')
                ), RequestType::CODE_404);
            }

            // create enrolment
            $enrolment = $this->enrolmentRepo->store($request, $authUser);

            DB::commit();

            //get all fields
            $enrolment->refresh();

            // load relationship data
            $enrolment->load(['child', 'parent', 'branch']);

            /* --------------- Send Mail ------------------ */

            if (($enrolment->signing_party === '0' && !is_null($enrolment->parent_id)) && ($enrolment->parent->email_verified && $enrolment->parent->login_access === '0'))
            {
                $enrolment->notify(
                    new ParentEnrolmentConfirmationMail(PathHelper::getBranchUrls($request->fullUrl(), $enrolment->branch))
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_save'),
                    new CCSEnrolmentResource($enrolment)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * View/get enrolment object
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function edit(Request $request)
    {
        try
        {
            // get enrolment
            $rowObj = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('index')), ['child', 'parent']);

            // read & update ccs enrolment status
            $data = $this->updateEnrolmentStatus($rowObj);

            // format data
            $status_history = [];

            if (!is_null($data) && !empty($data))
            {
                $statusList = new Jsonq();
                $statusList->collect($data[0]['statuses']['results']);
                $statusList->sortBy('time_stamp', 'desc');
                $status_history = $statusList->toArray();

                array_walk($status_history, function ($item)
                {
                    $item['status'] = CCSType::CCS_STATUS_MAP[$item['status']];
                });

                unset($statusList);
            }

            /*//check if booking updates found
            $start_date = $rowObj->enrollment_start_date;
            $end_date = Carbon::parse($rowObj->enrollment_start_date)->addDays($rowObj->number_weeks_cycle === '1' ? 6 : 13)->format('Y-m-d');

            // get booking slots
            $bookings = $this->bookingRepo
                ->where('child_id', $rowObj->child_id)
                ->where('is_casual', false)
                ->whereIn('status', ['0', '1'])
                ->whereBetween('date', [$start_date, $end_date])
                ->orderBy('date', 'ASC')
                ->orderBy('session_start', 'ASC')
                ->get();

            $bookings = $bookings->map(function ($item)
            {
                return [
                    'date' => $item->date,
                    'fee' => (string) $item->fee_id,
                    'start' => $item->session_start,
                    'end' => $item->session_end
                ];
            })->all();

            $enrolment_sessions = !empty($rowObj->session_routine) ? array_values(array_filter(array_map(function($item)
            {
                return (!$item['addedManually'] && $item['sessionType'] !== CCSType::ENROLMENT_SESSION_TYPE_MAP['1']) ? [
                    'date' => $item['date'],
                    'fee' => (string) Helpers::decodeHashedID($item['fee']),
                    'start' => $item['session']['start'],
                    'end' => $item['session']['end']
                ] : '';
            }, $rowObj->session_routine))) : [];*/

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'enrolment' => new CCSEnrolmentResource($rowObj, [ 'includeStatusHistory' => $status_history ]),
                        'has_update' => false // count(Helpers::compareArrays($bookings, $enrolment_sessions)) > 0
                    ]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update enrolment object
     * @param Request $request
     * @return JsonResponseAlias
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentSaveRequest::class);

            // check enrolment
            $data = $this->enrolmentRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            ($data['updated']) ? DB::commit() : DB::rollBack();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new CCSEnrolmentResource($data['item'])
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function updateParentStatus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // check enrolment
            $enrolment = $this->enrolmentRepo->updateParentStatus(Helpers::decodeHashedID($request->input('id')));

            DB::commit();

            $rowObj = $this->childRepo->findById(
                Helpers::decodeHashedID($request->input('child')),
                ['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'ccs_enrolment', 'cultural_details', 'emergencyContacts']
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_cwa_approved'),
                    new ChildResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function sendEmail(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // check enrolment
            $enrolment = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('id')), ['child', 'parent','branch']);

            if (($enrolment->signing_party === '0' && !is_null($enrolment->parent_id)) && ($enrolment->parent->email_verified && $enrolment->parent->login_access === '0') && $enrolment->arrangement_type === 'CWA')
            {
                $enrolment->notify(
                    new ParentEnrolmentConfirmationMail(PathHelper::getBranchUrls($request->fullUrl(), $enrolment->branch))
                );
            }

            $rowObj = $this->childRepo->findById(
                Helpers::decodeHashedID($request->input('child')),
                ['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'ccs_enrolment', 'cultural_details', 'emergencyContacts']
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_sent_email'),
                    new ChildResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Submit enrolment object
     * @param Request $request
     * @return JsonResponseAlias
     * @throws Exception
     */
    public function submit(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentSubmitRequest::class);

            // get form type
            $form_type = (! Helpers::IsNullOrEmpty($request->input('form_type'))) ? $request->input('form_type') : null;

            // submit form
            $enrolment = $this->enrolmentRepo->submit(
                Helpers::decodeHashedID($request->input('id')),
                $form_type,
                $request
            );

            // send sns message
            $this->snsService->publishEvent(
                Helpers::getConfig('enrolment_submit', AWSConfigType::SNS),
                [
                    'organization' => $enrolment->organization_id,
                    'branch' => $enrolment->branch_id,
                    'subjectid' => $enrolment->id,
                    'authpersonid' => auth()->user()->ccs_id,
                    'action' => is_null($form_type) ? SnsActionType::EnrolmentUpdate : SnsActionType::EnrolmentReEnrol
                ],
                LocalizationHelper::getTranslatedText('sns_subject.enrolment_submit_subject')
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_submitted'),
                    new CCSEnrolmentResource($enrolment)
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete enrolment object
     * @param Request $request
     * @return JsonResponseAlias
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // delete enrolment
            $delObj = $this->enrolmentRepo->delete(Helpers::decodeHashedID($request->input('id')));

            // get enrolments
            $enrolments = $this->enrolmentRepo->get([
                'child' => $delObj->child_id,
                'limit' => 5
            ], $request, [], false);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete'),
                    new CCSEnrolmentResourceCollection($enrolments)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Show entitlement
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function getEntitlement(Request $request)
    {
        try
        {
            $enrolment = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('index')), ['child', 'parent']);

            if (is_null($enrolment->enrolment_id))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found')
                    ), RequestType::CODE_404);
            }

            $ccs_api_response = CCSHelpers::getEnrolmentEntitlement([
                'ccsenrolmentid' => $enrolment->enrolment_id,
                'ccsdateofentitlement' => DateTimeHelper::getTimezoneDatetime(now(), auth()->user()->timezone)->format('Y-m-d') //old - Carbon::now()->format('Y-m-d')
            ]);

            if(count($ccs_api_response) < 1)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_entitlement_not_found')
                ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $ccs_api_response[0]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function getEnrolmentStatus(Request $request)
    {
        try
        {
            // get enrolment
            $enrolment = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('index')), ['child', 'parent']);

            // read & update ccs enrolment status
            $this->updateEnrolmentStatus($enrolment, true);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new CCSEnrolmentResource($enrolment)
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get child enrolemtn history
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function getEnrolmentHistory(Request $request)
    {
        try
        {
            // get enrolment
            $rowObj = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('index')), []);

            // get enrolment for api
            $ccs_api_response = CCSHelpers::getChildEnrolment([
                'ccsenrolmentid' => $rowObj->enrolment_id,
                'ccshistory' => 'true'
            ]);

            if (is_null($ccs_api_response) || empty($ccs_api_response))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_history_not_found')
                ), RequestType::CODE_404);
            }

            // order response
            $response = new Jsonq();
            $response->collect($ccs_api_response);
            $response->sortBy('last_updated_date_time', 'desc');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response->toArray()
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function verifyEnrolment(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentVerifyRequest::class);

            // get latest enrolment
            $ccs_api_response = CCSHelpers::getChildEnrolment([ 'ccsenrolmentid' => trim($request->input('enrolment')) ]);

            if (empty($ccs_api_response))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found')
                    ), RequestType::CODE_404);
            }

            $arrayq = new Jsonq();
            $arrayq->collect($ccs_api_response);
            $arrayq->sortBy('last_updated_date_time', 'desc');
            $arrayq->sortBy('record_effective_end_date', 'desc');

            $enrolment = $arrayq->toArray()[0];

            unset($arrayq);
            unset($ccs_api_response);

            // check enrolment status
            if (Helpers::IsNullOrEmpty($enrolment['status']))
            {
                $statusList = new Jsonq();
                $statusList->collect($enrolment['statuses']['results']);
                $statusList->sortBy('time_stamp', 'desc');
                $statusList = $statusList->toArray();

                $enrolment['status'] = $statusList[0]['status'];

                unset($statusList);
            }

            $childObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('child')), [ 'parents' ]);

            // validate child crn
            /*if ($enrolment['child_CRN'] !== $childObj->ccs_id)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.child_crn_invalid')
                    ), RequestType::CODE_404);
            }*/

            // status & parent validation
            $selected_parent = $childObj->parents->filter(function ($parent) use ($enrolment)
            {
                if (!Helpers::IsNullOrEmpty($enrolment['individual_CRN']))
                {
                    return $parent->ccs_id === $enrolment['individual_CRN'];
                }
                else
                {
                    return strtolower($parent->first_name) === strtolower($enrolment['signing_party_individual_first_name']) &&
                        strtolower($parent->last_name) === strtolower($enrolment['signing_party_individual_last_name']) &&
                        $parent->dob === $enrolment['individual_date_of_birth'];
                }
            });

            // validate arrangement type against parent account
            if ($enrolment['arrangement_type'] === array_keys(CCSType::ENROLMENT_ARRANGEMENT_TYPE)[0] && $selected_parent->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.individual_not_found')
                    ), RequestType::CODE_404);
            }

            // get mapped session list
            $data = $this->getSessionMap($request, $enrolment, $childObj);

            // create enrolment
            $request->request->add(['list' => [[
                'enrol_id' => $enrolment['enrolment_id'],
                'status' => $enrolment['status'],
                'enrollment_start' => $enrolment['arrangement_start_date'],
                'enrollment_end' => $enrolment['arrangement_end_date'] === '0000-00-00' ? null : $enrolment['arrangement_end_date'],
                'individual' => !$selected_parent->isEmpty() ? $selected_parent->first()->index : null,
                'child' => $childObj->index,
                'late_submission' => $enrolment['late_submission_reason'],
                'arrangement_type' => $enrolment['arrangement_type'],
                'arrangement_type_note' => $enrolment['arrangement_type'] === 'QA' ? $enrolment['signing_party_organisation_name'] : null,
                'session_type' => !Helpers::IsNullOrEmpty($enrolment['session_indicator']) ? $enrolment['session_indicator'] : 'B',
                'session_is_case' => $enrolment['is_child_in_state_care'],
                'signing_party' => !Helpers::IsNullOrEmpty($enrolment['individual_CRN']) ? '0' : '1',
                'signing_party_first_name' => !Helpers::IsNullOrEmpty($enrolment['individual_CRN']) ? $enrolment['signing_party_individual_first_name'] : null,
                'signing_party_last_name' => !Helpers::IsNullOrEmpty($enrolment['individual_CRN']) ? $enrolment['signing_party_individual_last_name'] : null,
                'is_case_details' => null,
                'notes' => null,
                'weeks_cycle' => $enrolment['number_of_weeks_cycle'],
                'initial_sessions' => $data['is_initial'] ? $data['list'] : [],
                'sessions' => !$data['is_initial'] ? $data['list'] : []
            ]]]);

            unset($selected_parent);
            unset($data);

            // store enrolment
            $authUser = $this->userRepo->with(['branch', 'branch.providerService'])->find(auth()->user()->id);

            $this->enrolmentRepo->migrate($request, $authUser->branch, $authUser);

            DB::commit();

            // get child relations
            $childObj->load(['ccs_enrolment']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_imported'),
                    new CCSEnrolmentResourceCollection($childObj->ccs_enrolment)
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function closeEnrolment(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentCloseRequest::class);

            $enrolment = $this->enrolmentRepo->close(Helpers::decodeHashedID($request->input('id')), $request);

            // send sns message
            $this->snsService->publishEvent(
                Helpers::getConfig('enrolment_submit', AWSConfigType::SNS),
                [
                    'organization' => $enrolment->organization_id,
                    'branch' => $enrolment->branch_id,
                    'subjectid' => $enrolment->id,
                    'authpersonid' => auth()->user()->ccs_id,
                    'action' => SnsActionType::EnrolmentClose
                ],
                LocalizationHelper::getTranslatedText('sns_subject.enrolment_submit_subject')
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new CCSEnrolmentResource($enrolment)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function getEnrolmentFromApi(Request $request)
    {
        try
        {
            // validation
            app(CCSEnrolmentReadRequest::class);

            // get latest enrolment
            $ccs_api_response = CCSHelpers::getChildEnrolment([ 'ccsenrolmentid' => trim($request->input('enrolment')) ]);

            if (empty($ccs_api_response))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found')
                    ), RequestType::CODE_404);
            }

            $arrayq = new Jsonq();
            $arrayq->collect($ccs_api_response);
            $arrayq->sortBy('last_updated_date_time', 'desc');
            $arrayq->sortBy('record_effective_end_date', 'desc');

            $enrolment = $arrayq->toArray()[0];

            unset($arrayq);
            unset($ccs_api_response);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_imported'),
                    $enrolment
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponseAlias
     * @throws ServerErrorException
     */
    public function getStatusHistory(Request $request)
    {
        try
        {
            // get enrolment
            $rowObj = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('index')), []);

            $status_history = [];

            if (!is_null($rowObj->enrolment_id))
            {
                $ccs_api_response = CCSHelpers::getChildEnrolment([ 'ccsenrolmentid' => $rowObj->enrolment_id ]);

                if (empty($ccs_api_response))
                {
                    throw new Exception(LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found'), ErrorType::CustomValidationErrorCode);
                }

                // get latest enrolment
                $arrayq = new Jsonq();
                $arrayq->collect($ccs_api_response);
                $arrayq->sortBy('last_updated_date_time', 'desc');
                $arrayq->sortBy('record_effective_end_date', 'desc');

                $ccs_api_response = $arrayq->toArray();

                unset($arrayq);

                if (is_array($ccs_api_response) && !empty($ccs_api_response[0]['statuses']['results']))
                {
                    $statusList = new Jsonq();
                    $statusList->collect($ccs_api_response[0]['statuses']['results']);
                    $statusList->sortBy('time_stamp', 'desc');
                    $statusList = $statusList->toArray();

                    $status_history = array_walk($statusList, function ($item)
                    {
                        $item['status'] = CCSType::CCS_STATUS_MAP[$item['status']];
                    });

                    unset($statusList);
                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        new CCSEnrolmentResource($rowObj, [ 'includeStatusHistory' => $status_history ])
                    ), RequestType::CODE_200);
            }
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param $ccs_api_response
     * @param $enrolment
     * @param $request
     */
    private function updateSessionRoutine($ccs_api_response, $enrolment, $request)
    {
        // update session routine
        if(is_array($ccs_api_response) && !empty($ccs_api_response) && !empty($ccs_api_response[0]['sessions']['results']))
        {
            $session_data = [];

            // get bookings
            $bookings = $this->bookingRepo->get([
                'org' => auth()->user()->organization_id,
                'branch' =>  auth()->user()->branch_id,
                'child' => $enrolment->child->id,
                'between_dates' => [ $ccs_api_response[0]['arrangement_start_date'], Carbon::parse($ccs_api_response[0]['arrangement_start_date'])->addDays(13)->toDateString() ]
            ], [ 'child', 'fee' ], $request, false);

            foreach ($ccs_api_response[0]['sessions']['results'] as $session)
            {
                $booking_list = [];

                if ($session['sessionDay'] === array_values(CCSType::ENROLMENT_SESSION_TYPE_MAP)[1])
                {
                    $booking_list = $bookings->filter(function ($item) use ($enrolment, $session)
                    {
                        return $item->child->id === $enrolment->child->id && floatval($item->price) === floatval($session['standardAmount']);
                    });
                }
                else
                {
                    $date = array_values(array_filter($this->getSessionDates($ccs_api_response[0]['arrangement_start_date'], $session['cycleWeekNumber']), function($i) use ($session) {
                        return (int) $i['index'] === (int) $session['sessionDay'];
                    }));

                    if (!empty($date))
                    {
                        $booking_list = $bookings->filter(function ($item) use ($enrolment, $session, $date)
                        {
                            return floatval($item->fee_amount) === floatval($session['standardAmount'])
                                && $item->date = $date[0]['date']
                                && $item->session_start === DateTimeHelper::convertTimeStringToMins($session['startTime'])
                                && $item->session_end === DateTimeHelper::convertTimeStringToMins($session['endTime']);
                        });
                    }

                    $session['date'] = !empty($date) ? $date[0]['date'] : null;
                    $session['session'] = [
                        'start' => $booking_list->isEmpty() ? null : $booking_list->first()->session_start,
                        'end' => $booking_list->isEmpty() ? null : $booking_list->first()->session_end
                    ];
                }

                $session['fee'] = $booking_list->isEmpty() ? null : $booking_list->first()->fee->index;
                $session['addedManually'] = false;

                array_push($session_data, $session);
            }
        }
    }

    /**
     * @param $arrangement_start_date
     * @param $cycleWeek
     * @return array
     */
    private function getSessionDates($arrangement_start_date, $cycleWeek)
    {
        if($cycleWeek === '0')
        {
            return [];
        }

        $session_start_date = Carbon::parse($arrangement_start_date);
        $session_end_date = $session_start_date->copy()->addDays($cycleWeek === '1' ? 6 : 13);
        $session_period = CarbonPeriod::create($session_start_date, $session_end_date);

        $session_dates = [];
        foreach ($session_period as $date)
        {
            array_push($session_dates, [
                'index' => $date->dayOfWeek,
                'name' => strtolower($date->englishDayOfWeek),
                'date' => $date->toDateString()
            ]);
        }

        unset($session_start_date);
        unset($session_end_date);
        unset($session_period);

        return $session_dates;
    }

    /**
     * @param Model $rowObj
     * @param bool $clear_error
     * @return bool|JsonResponseAlias
     * @throws Exception
     */
    private function updateEnrolmentStatus(Model $rowObj, bool $clear_error = false)
    {
        DB::beginTransaction();

        $ccs_api_response = [];

        try
        {
            if (!is_null($rowObj->enrolment_id))
            {
                $ccs_api_response = CCSHelpers::getChildEnrolment([ 'ccsenrolmentid' => $rowObj->enrolment_id ]);

                if (is_null($ccs_api_response) || empty($ccs_api_response))
                {
                    throw new Exception(LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found'), ErrorType::CustomValidationErrorCode);
                }

                $update_attributes = [];

                // remove if there is an error
                if ($clear_error)
                {
                    $update_attributes['sync_status'] = '1';
                    $update_attributes['sync_error'] = null;
                }

                // get latest enrolment
                $arrayq = new Jsonq();
                $arrayq->collect($ccs_api_response);
                $arrayq->sortBy('last_updated_date_time', 'desc');
                $arrayq->sortBy('record_effective_end_date', 'desc');

                $ccs_api_response = $arrayq->toArray();

                unset($arrayq);

                // update status api
                if (is_array($ccs_api_response) && !empty($ccs_api_response[0]['statuses']['results']))
                {
                    $statusList = new Jsonq();
                    $statusList->collect($ccs_api_response[0]['statuses']['results']);
                    $statusList->sortBy('time_stamp', 'desc');
                    $statusList = $statusList->toArray();

                    // status update trigger
                    $status_updated = false;

                    // check if status available
                    if (!Helpers::IsNullOrEmpty($ccs_api_response[0]['status']) && $ccs_api_response[0]['status'] !== $rowObj->status)
                    {
                        $update_attributes['status'] = $ccs_api_response[0]['status'];

                        $status_updated = true;
                    }
                    else if (Helpers::IsNullOrEmpty($ccs_api_response[0]['status']))
                    {
                        if (Helpers::IsNullOrEmpty($rowObj->status))
                        {
                            $update_attributes['status'] = $statusList[0]['status'];

                            $status_updated = true;
                        }
                        else if ($statusList[0]['status'] !== $rowObj->status)
                        {
                            $update_attributes['status'] = $statusList[0]['status'];

                            $status_updated = true;
                        }
                    }

                    // update database if status has updates
                    if ($status_updated)
                    {
                        // update history values
                        $history = is_null($rowObj->status_history) ? [] : $rowObj->status_history;

                        array_unshift($history, [
                            'time_stamp' => is_array($statusList) && !empty($statusList) ? Carbon::parse($statusList[0]['time_stamp']) : Carbon::now(),
                            'description' => 'enrolment status updated',
                            'status_text' => is_array($statusList) && !empty($statusList) ? $statusList[0]['status_text'] : '',
                            'reason' => is_array($statusList) && !empty($statusList) ? $statusList[0]['reason'] : '',
                            'status' => CCSType::CCS_STATUS_MAP[$update_attributes['status']],
                            'user' => [
                                'id' => auth()->user()->id,
                                'name' => auth()->user()->full_name
                            ]
                        ]);

                        $update_attributes['history'] = $history;
                    }

                    unset($statusList);
                }

                // update occurrence number
                if (is_null($rowObj->occurrence_number)) $update_attributes['occurrence_number'] = (int) $ccs_api_response[0]['occurrence_number'];

                // update enrol start date
                if (!Helpers::IsNullOrEmpty($ccs_api_response[0]['arrangement_start_date']) && $ccs_api_response[0]['arrangement_start_date'] !== '0000-00-00') $update_attributes['enrol_start'] = $ccs_api_response[0]['arrangement_start_date'];

                // update enrol end date
                if (!Helpers::IsNullOrEmpty($ccs_api_response[0]['arrangement_end_date']) && $ccs_api_response[0]['arrangement_end_date'] !== '0000-00-00') $update_attributes['enrol_end'] = $ccs_api_response[0]['arrangement_end_date'];

                // update enrolment attributes
                if (!empty($update_attributes))
                {
                    if (array_key_exists('sync_status', $update_attributes)) $rowObj->is_synced = $update_attributes['sync_status'];
                    if (array_key_exists('sync_error', $update_attributes)) $rowObj->syncerror = $update_attributes['sync_error'];
                    if (array_key_exists('enrol_start', $update_attributes)) $rowObj->enrollment_start_date = $update_attributes['enrol_start'];
                    if (array_key_exists('enrol_end', $update_attributes)) $rowObj->enrollment_end_date = $update_attributes['enrol_end'];
                    if (array_key_exists('status', $update_attributes)) $rowObj->status = $update_attributes['status'];
                    if (array_key_exists('history', $update_attributes)) $rowObj->status_history = $update_attributes['history'];
                    if (array_key_exists('occurrence_number', $update_attributes)) $rowObj->occurrence_number = $update_attributes['occurrence_number'];

                    if (array_key_exists('sync_status', $update_attributes) || array_key_exists('sync_error', $update_attributes) || array_key_exists('status', $update_attributes)
                        || array_key_exists('history', $update_attributes) || array_key_exists('occurrence_number', $update_attributes)
                        || array_key_exists('enrol_start', $update_attributes) || array_key_exists('enrol_end', $update_attributes))
                    {
                        $rowObj->update();

                        DB::commit();
                    }
                }
            }
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw $e;
        }

        return $ccs_api_response;
    }

    /**
     * @param $request
     * @param $enrolment
     * @param $childObj
     * @return array
     */
    private function getSessionMap($request, $enrolment, $childObj)
    {
        $sessionList = [];

        $fee_map = new Collection();

        // get resources
        $fees = $this->feeRepo->get([], [], $request, false);

        foreach ($enrolment['sessions']['results'] as $item)
        {
            if ($item['sessionType'] === array_values(CCSType::ENROLMENT_SESSION_TYPE_MAP)[1])
            {
                $fee_map = $fees->filter(function ($fee) use ($childObj, $enrolment, $item)
                {
                    return $fee->fee_type === '1' && $childObj->ccs_id === $enrolment['child_CRN'] && floatval($fee->net_amount) === floatval($item['standardAmount']);
                });
            }
            else
            {
                $date = array_values(array_filter($this->getSessionDates($enrolment['arrangement_start_date'], $item['cycleWeekNumber']), function($i) use ($item)
                {
                    return (int) $i['index'] === (int) $item['sessionDay'];
                }));

                if (!empty($date))
                {
                    $fee_map = $fees->filter(function ($fee) use ($enrolment, $item, $date, $childObj)
                    {
                        return $fee->fee_type === '0'
                            && $childObj->ccs_id === $enrolment['child_CRN']
                            && floatval($fee->net_amount) === floatval($item['standardAmount'])
                            && $fee->session_start === DateTimeHelper::convertTimeStringToMins($item['startTime'])
                            && $fee->session_end === DateTimeHelper::convertTimeStringToMins($item['endTime']);
                    });
                }

                $item['date'] = !empty($date) ? $date[0]['date'] : null;
                $item['session'] = [
                    'start' => $fee_map->isEmpty() ? null : $fee_map->first()->session_start,
                    'end' => $fee_map->isEmpty() ? null : $fee_map->first()->session_end
                ];
            }

            $item['fee'] = $fee_map->isEmpty() ? null : $fee_map->first()->index;
            $item['addedManually'] = false;

            //add labels
            $item['session_type_label'] = (! Helpers::IsNullOrEmpty($item['sessionType'])) ? CCSType::ENROLMENT_SESSION_INDICATOR[upperCase(substr($item['sessionType'], 0, 1))] : null;
            $item['session_measure_label'] = (! Helpers::IsNullOrEmpty($item['sessionUnitOfMeasure'])) ? CCSType::ENROLMENT_SESSION_UNIT_OF_MEASURE[$item['sessionUnitOfMeasure']] : null;

            array_push($sessionList, $item);
        }

        // check for errors
        $initial = false;

        if (count(array_filter($sessionList, function ($i) { return is_null($i['fee']); })) > 0)
        {
            $initial = true;

            array_walk($sessionList, function (&$session)
            {
                unset($session['session']);
                unset($session['fee']);
                unset($session['addedManually']);
            });
        }
        else
        {
            array_walk($sessionList, function (&$session)
            {
                unset($session['session_type_label']);
                unset($session['session_measure_label']);
            });
        }

        return [
            'list' => $sessionList,
            'is_initial' => $initial
        ];
    }
}
