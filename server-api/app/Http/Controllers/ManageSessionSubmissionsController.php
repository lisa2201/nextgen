<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use CCSHelpers;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ManageSessionSubmissionsGetRequest;
use Kinderm8\Http\Requests\ManageSessionSubmissionStoreRequest;
use Kinderm8\Http\Requests\ManageSessionSubmissionsWidgetRequest;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\SessionSubmissionResourceCollection;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\SessionSubmission\ISessionSubmissionRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use LocalizationHelper;
use Nahid\JsonQ\Jsonq;
use RequestHelper;
use function _\find;

class ManageSessionSubmissionsController extends Controller
{
    private $sessionSubmissionRepo;
    private $childRepo;
    private $enrolmentRepo;
    private $userRepo;
    private $attendanceRepo;
    private $ccsEntitlementRepo;
    private $branchRepo;
    private $snsService;

    public function __construct(ISessionSubmissionRepository $sessionSubmissionRepo, IChildRepository $childRepo, ICCSEnrolmentRepository $enrolmentRepo, IUserRepository $userRepo, IAttendanceRepository $attendanceRepo, ICCSEntitlementRepository $ccsEntitlementRepo, IBranchRepository $branchRepo, SNSContract $snsService)
    {
        set_time_limit(0);

        $this->sessionSubmissionRepo = $sessionSubmissionRepo;
        $this->childRepo = $childRepo;
        $this->enrolmentRepo = $enrolmentRepo;
        $this->userRepo = $userRepo;
        $this->attendanceRepo = $attendanceRepo;
        $this->ccsEntitlementRepo = $ccsEntitlementRepo;
        $this->branchRepo = $branchRepo;
        $this->snsService = $snsService;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function get(Request $request)
    {
        try
        {
            // validation
            app(ManageSessionSubmissionsGetRequest::class);

            // get information
            $child_id = (! Helpers::IsNullOrEmpty($request->input('child'))) ? Helpers::decodeHashedID($request->input('child')) : null;

            $args = [
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ];

            if (!is_null($child_id)) $args['reference'] = $child_id;

            $reference = $this->childRepo->get($args, [ 'session_ccs_enrolment' ], $request, false);

            // check if child or children exists
            if ($reference->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText(!is_null($child_id)
                            ? 'session-submission.bulk_session_child_not_found'
                            : 'session-submission.bulk_session_children_not_found')
                    ), RequestType::CODE_400);
            }

            // get attendance
            $attendances = $this->attendanceRepo->getBookingAttendance(
                $request,
                $reference,
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

            // get submitted sessions (ignore withdraw status)
            $session_submissions = $this->sessionSubmissionRepo->get($request, $reference, [
                'status_not_in' => array_keys(CCSType::SESSION_REPORT_STATUS)[10],
                'is_withdrawal_processed' => false
            ], ['enrolment', 'child']);

            // read from api and update local database
            $data = !$session_submissions->isEmpty() ? $this->updateSessionSubmissionStatus($request) : [];

            // get missing session submissions (local -> api)
            $missing_in_api = (!empty($data) && !empty($data['api_response'])) ? array_unique(array_values(array_filter($session_submissions->toArray(), function($item) use ($data)
            {
                return !find($data['api_response'], function($e) use ($item)
                {
                    return $item['enrolment']['enrolment_id'] === $e['enrolmentID'] && $item['session_report_date'] === $e['sessionReportStartDate'];
                });
            })), SORT_REGULAR) : [];

            /*------------------------------------------------------------*/

            // auth user
            $authUser = $this->userRepo->with(['branch.providerService'])->find(auth()->user()->id);

            // get entitlement from api
            $api_entitlements = ($authUser->branch->providerService->service_type !== array_keys(CCSType::SERIVCE_TYPE)[2]) ? CCSHelpers::getEnrolmentEntitlement([
                'ccsdateofentitlement' => $request->input('start')
            ]) : null;

            /*------------------------------------------------------------*/

            // get entitlement from db (only for ceased)
            $ceased_enrolments = $this->enrolmentRepo->get([
                'status' => array_keys(CCSType::CCS_STATUS_MAP)[1]
            ], $request, [], false);

            $db_entitlements = $this->ccsEntitlementRepo->findByEnrolmentId($ceased_enrolments->pluck('enrolment_id')->toArray(), [], []);

            unset($ceased_enrolments);

            /*------------------------------------------------------------*/

            \Log::debug(now()->toDateTimeString());

            // get waiting for submission
            $formatList = [];

            // find enrolment id and crn duplicates
            $duplicate_enrol_crn = [];

            // loop through children
            foreach ($reference as $item)
            {
                // ignore if child has same crn and enrolment id
                if ($this->getSame_CRN_EnrolmentId($reference, $item, true, $duplicate_enrol_crn)) continue;

                // attendance (booking)
                $child_attendance = $attendances->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                // child session
                $child_session = $session_submissions->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                // validate
                if ($this->validateEnrolment($child_session, $item, $request->input('start'))) continue;

                // get already submitted dates
                $selected_dates = $this->getSubmittedDates($child_session, $child_attendance);

                // check if all booking submitted || no care provided has confirm or receive status
                if ($this->validateSubmission($child_attendance, $item, $selected_dates)) continue;

                // format data
                $formatRoutine = array_map(function ($item)
                {
                    return [
                        'is_casual' => $item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1],
                        'day' => ($item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1]) ? 0 : Carbon::parse($item['date'])->dayOfWeek,
                    ];
                }, !empty($item->session_ccs_enrolment->first()->session_routine) ? $item->session_ccs_enrolment->first()->session_routine : (!is_null($item->session_ccs_enrolment->first()->initial_session_routine) ? $item->session_ccs_enrolment->first()->initial_session_routine : []));

                // get child pre school status
                if (!is_null($api_entitlements))
                {
                    $pre_school_status = array_values(array_filter($api_entitlements, function ($e) use ($item) { return $e['enrolmentID'] === $item->session_ccs_enrolment->first()->enrolment_id; }));

                    $pre_school_status = !is_null($pre_school_status) ? (empty($pre_school_status) ? 'N' : $pre_school_status[0]['preschoolExemption']) : '';
                }
                else
                {
                    $pre_school_status = (!$db_entitlements->isEmpty()) ? $db_entitlements->filter(function ($s) use ($item) { return $s->enrolment_id === $item->session_ccs_enrolment->first()->enrolment_id; })->sortByDesc('id')->first() : null;

                    $pre_school_status = !is_null($pre_school_status) ? $pre_school_status->pre_school_excemption : '';
                }

                array_push($formatList, [
                    'child' => new ChildResource($item, [ 'basic' => true ]),
                    'bookings' => new BookingResourceCollection($child_attendance, [ 'withAttendance' => true ]),
                    'enrolment_id' => !$item->session_ccs_enrolment->isEmpty() ? $item->session_ccs_enrolment->first()->enrolment_id : null,
                    'enrolment_ref' => !$item->session_ccs_enrolment->isEmpty() ? $item->session_ccs_enrolment->first()->index : null,
                    'enrolment_session_type' => !$item->session_ccs_enrolment->isEmpty() ? CCSType::ENROLMENT_SESSION_TYPE[$item->session_ccs_enrolment->first()->session_type] : null,
                    'pre_school_status' => !$item->session_ccs_enrolment->isEmpty() && !$item->session_ccs_enrolment->first()->isCeased() ? $pre_school_status : '',
                    'enrolment_routine' => $formatRoutine,
                    'selected' => $selected_dates,
                    'is_no_care' => $this->checkForNoCareSession($child_attendance, $item, $request->input('start'))
                ]);
            }

            \Log::debug(now()->toDateTimeString());
            if (!empty($duplicate_enrol_crn)) \Log::debug("same crn & enrolment id -> branch: {$this->branchRepo->findById(auth()->user()->branch_id)->name} -> children", array_values(array_unique($duplicate_enrol_crn)));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'submissions' => new SessionSubmissionResourceCollection($session_submissions),
                        'list' => $formatList,
                        'actions' => CCSType::SESSION_SUBMISSION_ACTION,
                        'reason_for_change' => CCSType::SESSION_REASON_FOR_CHANGE,
                        'missing' => !empty($data) ? $data['missing_locally'] : [],
                        'missing_api' => $missing_in_api
                    ]
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            //get children
            $children = $this->childRepo->get([
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ], [ 'session_ccs_enrolment'], $request, false);

            $response = [
                'children' => new ChildResourceCollection($children, [ 'basic' => true ])
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
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
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(ManageSessionSubmissionStoreRequest::class);

            // auth user
            $authUser = $this->userRepo
                ->with(['branch', 'branch.providerService'])
                ->find(auth()->user()->id);

            // create new session
            $session = $this->sessionSubmissionRepo->bulkStore(
                $request,
                $authUser,
                'ChildAttendance'
            );

            //get all fields
            $session->refresh();

            // load relationship data
            $session->load(['creator']);

            // send sns message
            $this->snsService->publishEvent(
                Helpers::getConfig('bulk_session_report_submit', AWSConfigType::SNS),
                [
                    'organization' => $session->organization_id,
                    'branch' => $session->branch_id,
                    'subjectdate' => $session->patch_updated_at,
                    'authpersonid' => $authUser->ccs_id,
                    'action' => 'Bulk Session Report'
                ],
                LocalizationHelper::getTranslatedText('sns_subject.bulk_session_submit_subject') . '(' . $session->updated_at->toDateTimeString() . ')'
            );

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
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
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function widgetSessionSubmissionSummary(Request $request)
    {
        try
        {
            // validation
            app(ManageSessionSubmissionsWidgetRequest::class);

            $branch_id = (! Helpers::IsNullOrEmpty($request->input('branch'))) ? Helpers::decodeHashedID($request->input('branch')) : null;

            // get children
            $children = $this->childRepo->get([
                'branch' => $branch_id,
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ], ['session_ccs_enrolment'], $request, false);

            // get waiting for submission
            $formatList = [];

            // check if children exists
            if (!$children->isEmpty())
            {
                // get attendance
                $attendances = $this->attendanceRepo->getBookingAttendance(
                    $request,
                    $children,
                    'Booking',
                    [ 'branch' => $branch_id ],
                    [],
                    false
                );

                // remove casual bookings which has no attendance or absent
                $attendances = $attendances->filter(function ($item)
                {
                    return !($item->is_casual && is_null($item->attendance));
                });

                // get submitted sessions
                $session_submissions = $this->sessionSubmissionRepo->get($request, $children, [
                    'status_not_in' => array_keys(CCSType::SESSION_REPORT_STATUS)[10],
                    'is_withdrawal_processed' => false,
                    'branch' => $branch_id
                ], ['enrolment', 'child']);

                // loop through children
                foreach ($children as $item)
                {
                    // ignore if child has same crn and enrolment id
                    if($this->getSame_CRN_EnrolmentId($children, $item)) continue;

                    // attendance (booking)
                    $child_attendance = $attendances->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                    // validate
                    if ($this->validateEnrolment($session_submissions, $item, $request->input('start'))) continue;

                    // child session
                    $child_session = $session_submissions->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                    // get already submitted dates
                    $selected_dates = $this->getSubmittedDates($child_session, $child_attendance);

                    // check if all booking submitted || no care provided has confirm or receive status
                    if ($this->validateSubmission($child_attendance, $item, $selected_dates)) continue;

                    // data map
                    array_push($formatList, [
                        'child' => new ChildResource($item, [ 'basic' => true ]),
                        'bookings' => new BookingResourceCollection($child_attendance, [ 'withAttendance' => true ]),
                        'selected' => $selected_dates
                    ]);
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'submissions' => [], //new SessionSubmissionResourceCollection($session_submissions),
                        'list' => $formatList,
                        'actions' => CCSType::SESSION_SUBMISSION_ACTION
                    ]
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * update session submission status etc
     * @param Request $request
     * @return array
     * @throws Exception
     */
    private function updateSessionSubmissionStatus(Request $request)
    {
        $ccs_api_response = [];
        $missing_locally = [];
        $update_list = [];

        try
        {
            $ccs_api_response = CCSHelpers::getSessionSubmissionDetails([
                'ccsstartdate' => $request->input('start'),
                'ccshistory' => true,
                'expand' => true
            ]);

            if (!empty($ccs_api_response))
            {
                \Log::info('bulk session read api response found (count: ' . count($ccs_api_response) . ')');

                // get enrolment ids
                $enrolments = $this->enrolmentRepo->get([
                    'enrolment_reference' => array_column($ccs_api_response, 'enrolmentID'),
                ], $request, [], false);

                // get submissions
                $submissions = $this->sessionSubmissionRepo->findByEnrolmentId($enrolments->pluck('id'), [ 'enrolment' ]);

                // update list
                foreach ($ccs_api_response as $record)
                {
                    // find session submission
                    $s_items = $submissions->filter(function ($e) use ($record)
                    {
                        return $e->enrolment->enrolment_id === $record['enrolmentID']
                            && $e->session_report_date === $record['sessionReportStartDate'];
                            //&& CCSHelpers::compareSessionRoutine($e->sessions, $record['SessionOfCares']['results']);
                    });

                    if (!empty($s_items))
                    {
                        if (isset($record['statuses']['results']) && !empty($record['statuses']['results']))
                        {
                            $statusList = new Jsonq();
                            $statusList->collect($record['statuses']['results']);
                            $statusList->sortBy('time_stamp', 'desc');
                            $statusList = $statusList->toArray();

                            // update all session for same report date
                            foreach ($s_items as $item)
                            {
                                // do not update the withdraw session
                                if ($item->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] || $item->is_withdrawal_processed) continue;

                                array_push($update_list, [
                                    'id' => $item->id,
                                    'status_history' => (array) $record['statuses']['results'],
                                    //'is_withdrawal_processed' => ($item->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] && $statusList[0]['status'] === array_keys(CCSType::SESSION_REPORT_STATUS)[7]) ? 'true' : 'false',
                                    'status' => $statusList[0]['status']
                                ]);
                            }

                            unset($statusList);
                        }
                    }
                    else
                    {
                        array_push($missing_locally, $record);
                    }
                }

                // batch update
                if (!empty($update_list))
                {
                    DB::beginTransaction();

                    try
                    {
                        $this->sessionSubmissionRepo->bulkUpdateStatus($update_list);

                        DB::commit();
                    }
                    catch (Exception $e)
                    {
                        DB::rollBack();

                        ErrorHandler::log($e);
                    }
                }
                else
                {
                    \Log::info('session submission updates not found (week start date: ' . $request->input('start') . ')');
                }
            }
            else
            {
                \Log::info('bulk session submission read return empty response (week start date: ' . $request->input('start') . ')');
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'api_response' => $ccs_api_response,
            'missing_locally' => $missing_locally
        ];
    }

    /**
     * validate enrolment on submission
     * @param $session_submissions
     * @param $item
     * @param string $date
     * @return bool
     */
    public function validateEnrolment($session_submissions, $item, string $date)
    {
        return ($item->session_ccs_enrolment->isEmpty()
            //|| (!$item->session_ccs_enrolment->isEmpty() && $item->session_ccs_enrolment->first()->status === 'CEASED' && $item->session_ccs_enrolment->first()->enrollment_end_date >= Carbon::parse($request->input('start'))->format('Y-m-d'))
            || $this->checkNoCareSessionSubmitted($session_submissions, $item, $date));
    }

    /**
     * validate submissions or no care provided has valid status (confirm & received)
     * @param $child_bookings
     * @param $item
     * @param $selected_dates
     * @return bool
     */
    public function validateSubmission($child_bookings, $item, $selected_dates)
    {
        return (
            ($child_bookings->isEmpty() && !in_array($item->session_ccs_enrolment->first()->status, CCSHelpers::getValidEnrolmentStatusForSubmission(true)))
            //|| $this->sessionSubmittedAlready($child_bookings, $selected_dates)
        );
    }

    /**
     * check if all booking submitted
     * @param Collection $bookings
     * @param $selected_dates
     * @return bool
     */
    public function sessionSubmittedAlready(Collection $bookings, $selected_dates)
    {
        $submitted = $bookings->filter(function ($i) { return !$i->isHoliday() && ($i->attendance && $i->attendance->ccs_submitted); });

        if ($submitted->isEmpty() || empty($selected_dates)) return false;

        return empty(array_unique(
            array_merge(
                array_diff(array_values(array_unique($submitted->pluck('date')->toArray())), $selected_dates),
                array_diff($selected_dates, array_values(array_unique($submitted->pluck('date')->toArray())))
            )
        ));
    }

    /**
     * get already submitted dates
     * @param Collection $child_session
     * @param Collection $bookings
     * @return array
     */
    public function getSubmittedDates(Collection $child_session, Collection $bookings)
    {
        $selected_dates = [];

        if ($child_session->count() > 0)
        {
            foreach ($child_session as $s)
            {
                // ignore withdrawal dates
                if ($s->status === array_keys(CCSType::SESSION_REPORT_STATUS)[7] && $s->is_withdrawal_processed ||
                    $s->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] && !$s->is_withdrawal_processed)
                {
                    continue;
                }

                $selected_dates = array_merge(
                    $selected_dates,
                    array_values(array_unique(array_map(function($item) { return $item['date']; }, $s->sessions)))
                );
            }

            // get only date matches with bookings
            $selected_dates = array_values(array_intersect(array_unique($selected_dates), $bookings->unique()->pluck('date')->toArray()));
        }

        return $selected_dates;
    }

    /**
     * check if the session is no care provider
     * @param Collection $child_attendance
     * @param Model $child
     * @param string $start_date
     * @return bool
     */
    public function checkForNoCareSession(Collection $child_attendance, Model $child, string $start_date)
    {
        return $child_attendance->isEmpty()
            && !$child->session_ccs_enrolment->isEmpty()
            && $child->session_ccs_enrolment->first()->enrollment_start_date <= Carbon::parse($start_date)->format('Y-m-d')
            && in_array($child->session_ccs_enrolment->first()->status, [ array_keys(CCSType::CCS_STATUS_MAP)[2], array_keys(CCSType::CCS_STATUS_MAP)[8]]);
    }

    /**
     * check if no care session already submitted for given week
     * @param Collection $sessions
     * @param Model $child
     * @param string $start_date
     * @return bool
     */
    public function checkNoCareSessionSubmitted(Collection $sessions, Model $child, string $start_date)
    {
        return !$sessions->filter(function($i) use ($start_date, $child)
        {
            return $i->child_id === $child->id
                && $i->no_care_provided
                && $i->session_report_date === $start_date
                && !($i->status === array_keys(CCSType::SESSION_REPORT_STATUS)[7] && $i->is_withdrawal_processed) // ignore status processed
                && !($i->status === array_keys(CCSType::SESSION_REPORT_STATUS)[10] && !$i->is_withdrawal_processed); // ignore status withdrawal
        })->isEmpty();
    }

    /**
     * @param Collection $children
     * @param Model $child
     * @param bool $log_duplicates
     * @param array $duplicate_enrol_crn
     * @return bool
     */
    public function getSame_CRN_EnrolmentId(Collection $children, Model $child,  bool $log_duplicates = true, array &$duplicate_enrol_crn = [])
    {
        $duplicate = $children->filter(function($i) use ($child)
        {
            return (!Helpers::IsNullOrEmpty($i->ccs_id) && !Helpers::IsNullOrEmpty($child->ccs_id) && $i->ccs_id === $child->ccs_id)
                && (!is_null($i->session_ccs_enrolment->first()) && !is_null($child->session_ccs_enrolment->first())
                    && !Helpers::IsNullOrEmpty($i->session_ccs_enrolment->first()->enrolment_id) && !Helpers::IsNullOrEmpty($child->session_ccs_enrolment->first()->enrolment_id)
                    && $i->session_ccs_enrolment->first()->enrolment_id === $child->session_ccs_enrolment->first()->enrolment_id);
        });

        if ($log_duplicates && !$duplicate->isEmpty() && $duplicate->count() > 1)
        {
            $duplicate_enrol_crn = array_merge($duplicate_enrol_crn, $duplicate->map(function($i) { return "child: {$i->full_name} ({$i->id})"; })->toArray());

            return true;
        }

        return false;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getSessionReports(Request $request)
    {
        $formatList = [];

        try
        {
            $weeks = $request->input('weeks');

            // get children
            $children = $this->childRepo->get([
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ], [ 'session_ccs_enrolment' ], $request, false);

            // check if child or children exists
            if ($children->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('session-submission.bulk_session_children_not_found'),
                        []
                    ), RequestType::CODE_400);
            }

            // get attendance
            $attendances = $this->attendanceRepo->getBookingAttendance(
                $request,
                $children,
                'Booking',
                [ 'between_dates' => [ $weeks[0]['start'], $weeks[count($weeks) - 1]['end'] ] ],
                [ 'child', 'attendance' ],
                false
            );

            // remove casual bookings which has no attendance or absent
            $attendances = $attendances->filter(function ($item)
            {
                return !($item->is_casual && is_null($item->attendance));
            });

            // check if booking available
            if ($attendances->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('session-submission.bulk_session_not_found'),
                        []
                    ), RequestType::CODE_400);
            }

            // get submitted
            $session_submissions = $this->sessionSubmissionRepo->get($request, $children, [
                'status_not_in' => array_keys(CCSType::SESSION_REPORT_STATUS)[10],
                'is_withdrawal_processed' => false,
                'between_dates' => [ $weeks[0]['start'], $weeks[count($weeks) - 1]['end'] ]
            ], []);

            // loop through weeks
            foreach ($weeks as $week)
            {
                $week_list = [];

                // check for enrolment start date validation
                $week_children = $children->filter(function ($item) use ($week)
                {
                    return Carbon::parse($item->session_ccs_enrolment->first()->enrollment_start_date)->lte(Carbon::parse($week['start']));
                });

                // get child week attendance
                $week_attendance = $attendances
                    ->filter(function ($item) use ($week_children) { return in_array($item->child_id, $week_children->pluck('id')->toArray()); })
                    ->whereBetween('date', [ $week['start'], $week['end']]);

                // get week sessions
                $week_sessions = $session_submissions
                    ->filter(function ($item) use ($week_children) { return in_array($item->child_id, $week_children->pluck('id')->toArray()); })
                    ->whereBetween('session_start_date', [ $week['start'], $week['end']]);

                // loop through children
                foreach ($week_children as $item)
                {
                    // ignore if child has same crn and enrolment id
                    if ($this->getSame_CRN_EnrolmentId($week_children, $item)) continue;

                    // attendance (booking)
                    $child_attendance = $week_attendance->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                    // child session
                    $child_session = $week_sessions->filter(function($i) use ($item) { return $i->child_id === $item->id; });

                    /*----------------------------------------*/

                    // validate
                    if ($this->validateEnrolment($child_session, $item, $week['start'])) continue;

                    // get already submitted dates
                    $selected_dates = $this->getSubmittedDates($child_session, $child_attendance);

                    // check if all booking submitted || no care provided has confirm or receive status
                    if ($this->validateSubmission($child_attendance, $item, $selected_dates)) continue;

                    // format data
                    $formatRoutine = array_map(function ($item)
                    {
                        return [
                            'is_casual' => $item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1],
                            'day' => ($item['sessionType'] === CCSType::ENROLMENT_SESSION_TYPE_MAP[1]) ? 0 : Carbon::parse($item['date'])->dayOfWeek,
                        ];
                    }, !empty($item->session_ccs_enrolment->first()->session_routine) ? $item->session_ccs_enrolment->first()->session_routine : (!is_null($item->session_ccs_enrolment->first()->initial_session_routine) ? $item->session_ccs_enrolment->first()->initial_session_routine : []));

                    array_push($week_list, [
                        'child' => new ChildResource($item, [ 'short' => true ]),
                        'bookings' => new BookingResourceCollection($child_attendance, [ 'withAttendance' => true, 'forSessionSummary' => true ]),
                        'enrolment_routine' => $formatRoutine,
                        'selected' => $selected_dates,
                        'is_no_care' => $this->checkForNoCareSession($child_attendance, $item, $week['start'])
                    ]);
                }

                array_push($formatList, [
                    'week' => $week,
                    'items' => $week_list,
                    'submissions' => new SessionSubmissionResourceCollection($week_sessions)
                ]);
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                [
                    'list' => $formatList,
                    'actions' => CCSType::SESSION_SUBMISSION_ACTION,
                    'reason_for_change' => CCSType::SESSION_REASON_FOR_CHANGE
                ]
            ), RequestType::CODE_200);
    }
}
