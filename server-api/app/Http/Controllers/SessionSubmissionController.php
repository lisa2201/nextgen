<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use CCSHelpers;
use DB;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\SessionPreviewRequest;
use Kinderm8\Http\Requests\SessionReportResubmitRequest;
use Kinderm8\Http\Requests\SessionReportSubmitRequest;
use Kinderm8\Http\Requests\SessionReportWithdrawRequest;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\SessionSubmissionResource;
use Kinderm8\Http\Resources\SessionSubmissionResourceCollection;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\SessionSubmission\ISessionSubmissionRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use Nahid\JsonQ\Jsonq;
use RequestHelper;

class SessionSubmissionController extends Controller
{
    private $sessionSubmissionRepo;
    private $childRepo;
    private $enrolmentRepo;
    private $userRepo;
    private $attendanceRepo;
    private $ccsEntitlementRepo;
    private $snsService;

    public function __construct(ISessionSubmissionRepository $sessionSubmissionRepo, IChildRepository $childRepo, ICCSEnrolmentRepository $enrolmentRepo, IUserRepository $userRepo, IAttendanceRepository $attendanceRepo, SNSContract $snsService, ICCSEntitlementRepository $ccsEntitlementRepo)
    {
        $this->sessionSubmissionRepo = $sessionSubmissionRepo;
        $this->childRepo = $childRepo;
        $this->enrolmentRepo = $enrolmentRepo;
        $this->userRepo = $userRepo;
        $this->attendanceRepo = $attendanceRepo;
        $this->ccsEntitlementRepo = $ccsEntitlementRepo;
        $this->snsService = $snsService;
    }

    /**
     * Get session report list
     * @param Request $request
     * @return mixed
     */
    public function get(Request $request)
    {
        $data = $this->sessionSubmissionRepo->list([], $request);

        return (new SessionSubmissionResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters'])
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * Get session submission related data
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $rowObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('id')), [ 'ccs_enrolment' ]);

            if (is_null($rowObj->ccs_enrolment->first()) || Helpers::IsNullOrEmpty($rowObj->ccs_enrolment->first()->enrolment_id))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found')
                    ), RequestType::CODE_400);
            }

            // check if any enrolment available
            $ccs_api_response = CCSHelpers::getChildEnrolment([
                'ccsenrolmentid' => $rowObj->ccs_enrolment->first()->enrolment_id
            ]);

            if (is_null($ccs_api_response) || (is_array($ccs_api_response) && empty($ccs_api_response)))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.active_enrolment_not_found')
                    ), RequestType::CODE_400);
            }

            $arrayq = new Jsonq();
            $arrayq->collect($ccs_api_response);
            $arrayq->sortBy('last_updated_date_time', 'desc');
            $arrayq->sortBy('record_effective_end_date', 'desc');

            // get session routines
            $enrolment = $this->enrolmentRepo->get(
                [
                    'enrolment_reference' => $arrayq->toArray()[0]['enrolment_id'],
                    'child' => $rowObj->id
                ],
                $request, [],false
            )->first();

            unset($arrayq);
            unset($ccs_api_response);

            // validate enrolment
            if (is_null($enrolment))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_not_found')
                    ), RequestType::CODE_400);
            }

            // validate status
            if (!in_array($enrolment->status, CCSHelpers::getValidEnrolmentStatusForSubmission()))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.invalid_enrolment_status')
                    ), RequestType::CODE_400);
            }

            // format data
            $formatRoutine = array_map(function ($item)
            {
                return [
                    'is_casual' => $item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1],
                    'day' => ($item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1]) ? 0 : Carbon::parse($item['date'])->dayOfWeek,
                ];
            }, !empty($enrolment->session_routine) ? $enrolment->session_routine : $enrolment->initial_session_routine);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'enrolment_reference' => $enrolment->index,
                        'enrolment_id' => $enrolment->enrolment_id,
                        'enrolment_routine' => $formatRoutine,
                        'actions' => CCSType::SESSION_SUBMISSION_ACTION,
                        'reason_for_change' => CCSType::SESSION_REASON_FOR_CHANGE
                    ]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get session submission withdrawal related data
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getWithdrawalDependency(Request $request)
    {
        try
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'withdrawal_reason' => CCSType::SESSION_WITHDRAW_REASON_FOR_CHANGE
                    ]
                ), RequestType::CODE_201);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get session details
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function getSessionDetails(Request $request)
    {
        try
        {
            // validation
            app(SessionPreviewRequest::class);

            // get child
            $rowObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('id')), [ 'session_ccs_enrolment' ]);

            /*// check for valid enrolment
            if ($rowObj->session_ccs_enrolment->first()->enrollment_start_date > Carbon::parse($request->input('start'))->format('Y-m-d'))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('enrolment.enrolment_start_date_validation')
                    ), RequestType::CODE_400);
            }*/

            // get submitted details from db
            $sessions = $this->sessionSubmissionRepo->get($request, $rowObj, [], []);

            // check if withdrawn is not processed for selected week
            $withdrawn = $sessions->filter(function ($item) use ($request)
            {
                return $item->session_report_date === $request->input('start') &&
                    $item->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] && !$item->is_withdrawal_processed;
            });

            if (!$withdrawn->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('session-submission.sessions_withdrawal_not_processed')
                    ), RequestType::CODE_400);
            }

            // check if no care session already submitted
            if (app(ManageSessionSubmissionsController::class)->checkNoCareSessionSubmitted($sessions, $rowObj, $request->input('start')))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('session-submission.no_care_session_submitted')
                    ), RequestType::CODE_400);
            }

            // get details
            $attendances = $this->attendanceRepo->getBookingAttendance(
                $request,
                $rowObj,
                'Booking',
                [],
                [],
                false
            );

            // remove casual bookings which has no attendance or absent
            $attendances = $attendances->filter(function ($item)
            {
                return !($item->is_casual && is_null($item->attendance));
            });

            // get already submitted dates
            $selected_dates = app(ManageSessionSubmissionsController::class)->getSubmittedDates($sessions, $attendances);

            // validate submissions
            if (app(ManageSessionSubmissionsController::class)->validateSubmission($attendances, $rowObj, $selected_dates))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('session-submission.session_submitted')
                    ), RequestType::CODE_400);
            }

            // get enrolment
            $enrolment = $this->enrolmentRepo->findByEnrolmentId($request->input('enrol_id'), false);

            // auth user
            $authUser = $this->userRepo->with(['branch.providerService'])->find(auth()->user()->id);

            // is pre school default
            $pre_school_status = '';

            if ($authUser->branch->providerService->service_type !== array_keys(CCSType::SERIVCE_TYPE)[2] && !$enrolment->isCeased())
            {
                // get entitlement data
                $entitlement = $this->ccsEntitlementRepo->findByEnrolmentId($enrolment->enrolment_id, [], [
                    'order' => [
                        'column' => 'date',
                        'value' => 'desc'
                    ]
                ])->first();

                // if not found in db get it from api
                if (is_null($entitlement))
                {
                    $ccs_api_response = CCSHelpers::getEnrolmentEntitlement([
                        'ccsenrolmentid' => $request->input('enrol_id'),
                        'ccsdateofentitlement' => $request->input('start')
                    ]);

                    $pre_school_status = !is_null($ccs_api_response) ? (empty($ccs_api_response) ? 'N' : $ccs_api_response[0]['preschoolExemption']) : '';
                }
                else
                {
                    $pre_school_status = $entitlement->pre_school_excemption;
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'bookings' => new BookingResourceCollection($attendances, [ 'withAttendance' => true ]),
                        'selected' => $selected_dates,
                        'pre_school_status' => $pre_school_status,
                        'is_no_care' => app(ManageSessionSubmissionsController::class)->checkForNoCareSession($attendances, $rowObj, $request->input('start'))
                    ]
                ), RequestType::CODE_201);
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
     * Store session report object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(SessionReportSubmitRequest::class);

            // get enrolment
            $enrolment = $this->enrolmentRepo->findById(Helpers::decodeHashedID($request->input('enrol_reference')), []);

            // auth user
            $authUser = $this->userRepo
                ->with(['branch', 'branch.providerService'])
                ->find(auth()->user()->id);

            // create new session
            $session = $this->sessionSubmissionRepo->store(
                $request,
                $enrolment,
                $authUser,
                'ChildAttendance'
            );

            // send sns message
           $this->snsService->publishEvent(
               Helpers::getConfig('session_report_submit', AWSConfigType::SNS),
               [
                   'organization' => $session->organization_id,
                   'branch' => $session->branch_id,
                   'subjectid' => $session->id,
                   'authpersonid' => $authUser->ccs_id,
                   'action' => 'New vancancy'
               ],
               LocalizationHelper::getTranslatedText('sns_subject.session_submit_subject')
           );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);
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
     * Withdraw session report object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function withdraw(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(SessionReportWithdrawRequest::class);

            $session = $this->sessionSubmissionRepo
                ->withdraw(
                    Helpers::decodeHashedID($request->input('id')),
                    $request,
                    'ChildAttendance'
                );

            // send withdraw sns
            $this->snsService->publishEvent(
                Helpers::getConfig('session_report_withdraw', AWSConfigType::SNS),
                [
                    'organization' => $session->organization_id,
                    'branch' => $session->branch_id,
                    'subjectid' => $session->id,
                    'authpersonid' => auth()->user()->ccs_id,
                    'action' => 'SESSION_REPORT_WITHDRAWAL'
                ],
                LocalizationHelper::getTranslatedText('sns_subject.enrolment_withdraw_subject')
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_processed'),
                    new SessionSubmissionResource($session)
                ), RequestType::CODE_201);
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
     * Delete session submission object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->sessionSubmissionRepo->delete(
                Helpers::decodeHashedID($request->input('id')),
                'ChildAttendance'
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function resubmitPreview(Request $request)
    {
        try
        {
            // get session
            $session = $this->sessionSubmissionRepo->findById(Helpers::decodeHashedID($request->input('id')), [ 'child', 'child.session_ccs_enrolment']);

            // add date params
            $request->request->add([
                'start' => $session->session_start_date,
                'end' => $session->session_end_date
            ]);

            // get details
            $attendances = $this->attendanceRepo->getBookingAttendance(
                $request,
                $session->child,
                'Booking',
                [],
                [],
                true
            );

            // remove casual bookings which has no attendance or absent
            $attendances = $attendances->filter(function ($item)
            {
                return !($item->is_casual && is_null($item->attendance));
            });

            // get already selected dates
            $selected_dates = array_values(array_unique(
                array_intersect(
                    array_unique(array_map(function($item) { return $item['date']; }, $session->sessions)),
                    $attendances->unique()->pluck('date')->toArray()
                )
            ));

            // auth user
            $authUser = $this->userRepo->with(['branch.providerService'])->find(auth()->user()->id);

            // is pre school default
            $pre_school_status = '';

            if ($authUser->branch->providerService->service_type !== array_keys(CCSType::SERIVCE_TYPE)[2]
                && (!$session->child->session_ccs_enrolment->isEmpty() && !$session->child->session_ccs_enrolment->first()->isCeased()))
            {
                // get entitlement data
                $entitlement = $this->ccsEntitlementRepo->findByEnrolmentId($session->enrolment_id, [], [
                    'date' => $session->session_start_date
                ])->first();

                // if not found in db get it from api
                if (is_null($entitlement))
                {
                    $ccs_api_response = CCSHelpers::getEnrolmentEntitlement([
                        'ccsenrolmentid' => $request->input('enrol_id'),
                        'ccsdateofentitlement' => $request->input('start')
                    ]);

                    $pre_school_status = !empty($ccs_api_response) ? $ccs_api_response[0]['preschoolExemption'] : 'N';
                }
                else
                {
                    $pre_school_status = $entitlement->pre_school_excemption;
                }
            }

            // get session routines
            $enrolment = $this->enrolmentRepo->findById($session->enrolment_id, []);

            // format data
            $formatRoutine = array_map(function ($item)
            {
                return [
                    'is_casual' => $item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1],
                    'day' => ($item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1]) ? 0 : Carbon::parse($item['date'])->dayOfWeek,
                ];
            }, !empty($enrolment->session_routine) ? $enrolment->session_routine : $enrolment->initial_session_routine);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'enrolment_routine' => $formatRoutine,
                        'bookings' => new BookingResourceCollection($attendances, [ 'withAttendance' => true ]),
                        'selected' => $selected_dates,
                        'pre_school_status' => $pre_school_status,
                        'is_no_care' => app(ManageSessionSubmissionsController::class)->checkForNoCareSession($attendances, $session->child, $session->session_report_date)
                    ]
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function resubmit(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(SessionReportResubmitRequest::class);

            // auth user
            $authUser = $this->userRepo
                ->with(['branch', 'branch.providerService'])
                ->find(auth()->user()->id);

            // create new session from existing data
            $session = $this->sessionSubmissionRepo->recreate(
                $request,
                $authUser,
                'ChildAttendance'
            );

            // send sns message
            $this->snsService->publishEvent(
                Helpers::getConfig('session_report_submit', AWSConfigType::SNS),
                [
                    'organization' => $session->organization_id,
                    'branch' => $session->branch_id,
                    'subjectid' => $session->id,
                    'authpersonid' => $authUser->ccs_id,
                    'action' => 'Resubmit vancancy'
                ],
                LocalizationHelper::getTranslatedText('sns_subject.session_submit_subject')
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_submitted')
                ), RequestType::CODE_201);
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
     * read session submission
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function readSessionSubmission(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // get submission
            $session = $this->sessionSubmissionRepo->findById(Helpers::decodeHashedID($request->input('index')), ['enrolment']);

            // sns synced
            if ($session->is_synced !== '0')
            {
                // read session submission from api
                $ccs_api_response = CCSHelpers::getSessionSubmissionDetails([
                    'ccsenrolmentid' => $session->enrolment->enrolment_id,
                    'ccsstartdate' => $session->session_report_date,
                    'ccshistory' => true,
                    'expand' => true
                ]);

                if (is_null($ccs_api_response) || empty($ccs_api_response))
                {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_400,
                            LocalizationHelper::getTranslatedText('session-submission.session_not_found')
                        ), RequestType::CODE_400);
                }

                // update
                if (isset($ccs_api_response[0]['statuses']['results'])
                    && !empty($ccs_api_response[0]['statuses']['results'])
                    //&& CCSHelpers::compareSessionRoutine($session->sessions, $ccs_api_response[0]['SessionOfCares']['results'])
                )
                {
                    // update history
                    $session->status_history = (array) $ccs_api_response[0]['statuses']['results'];

                    // update status
                    $statusList = new Jsonq();
                    $statusList->collect($ccs_api_response[0]['statuses']['results']);
                    $statusList->sortBy('time_stamp', 'desc');
                    $statusList = $statusList->toArray();

                    $session->is_withdrawal_processed = ($session->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] && $statusList[0]['status'] === array_keys(CCSType::SESSION_REPORT_STATUS)[7]);
                    $session->status = $statusList[0]['status'];
                    $session->update();

                    DB::commit();

                    unset($statusList);
                    unset($ccs_api_response);
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new SessionSubmissionResource($session)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
