<?php

namespace Kinderm8\Repositories\SessionSubmission;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Services\DatabaseBatch\BatchContract;
use Kinderm8\SessionSubmission;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class SessionSubmissionRepository implements ISessionSubmissionRepository
{
    use UserAccessibility;

    private $submission;
    private $batchService;

    private $sortColumnsMap = [
        'email' => 'user_email',
        'branch' => 'name',
        'expires' => 'expires_at'
    ];

    public function __construct(SessionSubmission $submission, BatchContract $batchService)
    {
        $this->submission = $submission;
        $this->batchService = $batchService;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->submission, $method], $args);
    }

    /**
     * @param Request $request
     * @param $child_ref
     * @param array $args
     * @param array $depend
     * @return Builder[]|Collection
     */
    public function get(Request $request, $child_ref, array $args, array $depend)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $sessions = $this->submission->query();

        // access
        $sessions = $this->attachAccessibilityQuery($sessions);

        // attach week selection
        $sessions->when(!is_null($start) && !is_null($end), function ($query) use ($start, $end)
        {
            return $query->where('session_start_date', $start)->where('session_end_date', $end);
        });

        // attach relationship data
        if (!empty($depend))
        {
            $sessions->with($depend);
        }

        $sessions->when(!is_null($child_ref), function ($query) use ($child_ref)
        {
            return $child_ref instanceof Model
                ? $query->where('child_id', $child_ref->id)
                : $query->whereIn('child_id', $child_ref->pluck('id'));
        });

        if (is_array($args) && !empty($args))
        {
            $sessions
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']) && !is_null($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['is_withdrawal_processed']), function ($query) use ($args)
                {
                    return $query->where('is_withdrawal_processed', $args['is_withdrawal_processed']);
                })
                ->when(isset($args['between_dates']) && is_array($args['between_dates']) && !empty($args['between_dates']), function ($query) use ($args)
                {
                    return $query->whereBetween('session_start_date', $args['between_dates']);
                })
                ->when(isset($args['month']) && !is_null($args['month']), function ($query) use ($args)
                {
                    return $query->whereRaw('EXTRACT(MONTH FROM session_start_date) = ?', [ $args['month'] ]);
                })
                ->when(isset($args['year']) && !is_null($args['year']), function ($query) use ($args)
                {
                    return $query->whereRaw('EXTRACT(YEAR FROM session_start_date) = ?', [ $args['year'] ]);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['status_not_in']), function ($query) use ($args)
                {
                    return is_array($args['status_not_in'])
                        ? $query->whereNotIn('status', $args['status_not_in'])
                        : $query->where('status', '!=', $args['status_not_in']);
                })
                ->when(isset($args['ignore_withdrawal_processed']), function ($query) use ($args)
                {
                     return $query->whereRaw('(status != ? AND is_withdrawal_processed != ?)', [array_keys(CCSType::SESSION_REPORT_STATUS)[7], true]);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $sessions->orderBy('id', 'desc');
        }

        return $sessions->get();
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function list($args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            // child id
            $child_id = Helpers::decodeHashedID($request->input('id'));

            //query builder
            $sessions = $this->submission
                ->join('km8_child_ccs_enrolment', 'km8_child_ccs_enrolment.id', '=', 'km8_session_submission.enrolment_id')
                ->where('km8_session_submission.child_id', $child_id);

            // access
            $sessions = $this->attachAccessibilityQuery($sessions, null, 'km8_session_submission');

            //get actual count
            $actualCount = $sessions->get()->count();

            //filters
            if (!is_null($filters))
            {
                /*if (isset($filters->status) && $filters->status !== '0')
                {
                    $sessions->whereRaw("DATE(km8_user_invitations.expires_at) " . (($filters->status === '1') ? "<" : ">") . " '" . Carbon::now()->toDateString() . "'");
                }

                if (isset($filters->branch) && !is_null($filters->branch))
                {
                    if (strtolower($filters->branch) === 'none')
                    {
                        $sessions->whereNull('branch_id');
                    } else {
                        $sessions->where('branch_id', Helpers::decodeHashedID($filters->branch));
                    }
                }*/
            }

            //search
            if (!is_null($searchValue))
            {
                $sessions->whereLike([
                    'km8_session_submission.session_start_date',
                    'km8_session_submission.session_end_date',
                    'km8_child_ccs_enrolment.enrolment_id'
                ], $searchValue);
            }

            $sessions = $sessions
                ->orderBy('km8_session_submission.session_start_date', 'DESC')
                ->select(['km8_session_submission.*'])
                ->orderBy('km8_session_submission.id', 'DESC')
                ->paginate($offset);

            // load relationships after pagination
            $sessions->load(['creator', 'enrolment']);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $sessions = [];
        }

        return [
            'list' => $sessions,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param Request $request
     * @param Model|null $enrolment
     * @param Model|null $authUser
     * @param string $attendance_model
     * @return mixed
     * @throws Exception
     */
    public function store(Request $request, ?Model $enrolment, ?Model $authUser, string $attendance_model)
    {
        // check auth user
        if (is_null($authUser->branch) || is_null($authUser->branch->providerService) || is_null($authUser->branch->providerService->address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.provider_service_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $physical_address = array_values(array_filter(array_map(function($item) { return $item['type'] === 'ZPHYSICAL' ? $item : ''; }, $authUser->branch->providerService->address)));

        // check if physical address available
        if (empty($physical_address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.physical_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // map session values
        $formattedList = $this->formatSessions($request->input('sessions'), $physical_address);

        // create submission
        $session = new $this->submission;

        $session->organization_id = $authUser->organization_id;
        $session->branch_id = $authUser->branch_id;
        $session->created_by = $authUser->id;
        $session->child_id = (! Helpers::IsNullOrEmpty($request->input('child'))) ? Helpers::decodeHashedID($request->input('child')) : null;
        $session->enrolment_id = $enrolment->id;

        $session->session_start_date = (! Helpers::IsNullOrEmpty($request->input('start_date'))) ? $request->input('start_date') : null;
        $session->session_end_date = (! Helpers::IsNullOrEmpty($request->input('end_date'))) ? $request->input('end_date') : null;
        $session->session_report_date = (! Helpers::IsNullOrEmpty($request->input('report_date'))) ? $request->input('report_date') : null;
        $session->action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;
        $session->no_care_provided = ($request->input('is_no_care_provided') && empty($formattedList));
        $session->reason_for_change = (! Helpers::IsNullOrEmpty($request->input('change_reason'))) ? $request->input('change_reason') : 'NONE';
        $session->reason_for_late_change = (! Helpers::IsNullOrEmpty($request->input('reason_late_change'))) ? $request->input('reason_late_change') : null;
        $session->reason_for_no_change = (! Helpers::IsNullOrEmpty($request->input('reason_no_change'))) ? $request->input('reason_no_change') : null;
        $session->sessions = $formattedList;
        $session->submission_type = '1';

        // set history
        $session->status_history = [
            [
                'time_stamp' => Carbon::now(),
                'status' => CCSType::SESSION_REPORT_STATUS['NONE'],
            ]
        ];

        // update attendance table
        app("Kinderm8\\{$attendance_model}")
            ->where('organization_id', $session->organization_id)
            ->where('branch_id', $session->branch_id)
            ->where('child_id', $session->child_id)
            ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
            ->whereIn('date', array_map(function($item) { return $item['date']; }, $formattedList))
            ->update([ 'ccs_submitted' => true ]);

        $session->save();

        // get all fields
        //$session->refresh();

        // load relationship data
        //$session->load(['creator']);

        return $session;
    }

    /**
     * @param Request $request
     * @param Model|null $authUser
     * @param string $attendance_model
     * @return null
     * @throws Exception
     */
    public function bulkStore(Request $request, ?Model $authUser, string $attendance_model)
    {
        // check auth user
        if (is_null($authUser->branch) || is_null($authUser->branch->providerService) || is_null($authUser->branch->providerService->address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.provider_service_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $physical_address = array_values(array_filter(array_map(function($item) { return $item['type'] === 'ZPHYSICAL' ? $item : ''; }, $authUser->branch->providerService->address)));

        // check if physical address available
        if (empty($physical_address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.physical_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $patch_updated_date = Carbon::now();
        $first_session_report = null;

        // bulk insert
        foreach ($request->input('sessions') as $key => $item)
        {
            // map session values
            $formattedList = $this->formatSessions($item['sessions'], $physical_address);

            // create submission
            $session = new $this->submission;

            $session->organization_id = $authUser->organization_id;
            $session->branch_id = $authUser->branch_id;
            $session->created_by = $authUser->id;
            $session->child_id = (! Helpers::IsNullOrEmpty($item['child'])) ? Helpers::decodeHashedID($item['child']) : null;
            $session->enrolment_id = (! Helpers::IsNullOrEmpty($item['enrol_id'])) ? Helpers::decodeHashedID($item['enrol_id']) : null;

            $session->session_start_date = (! Helpers::IsNullOrEmpty($item['start_date'])) ? $item['start_date'] : null;
            $session->session_end_date = (! Helpers::IsNullOrEmpty($item['end_date'])) ? $item['end_date'] : null;
            $session->session_report_date = (! Helpers::IsNullOrEmpty($item['report_date'])) ? $item['report_date'] : null;
            $session->action = (! Helpers::IsNullOrEmpty($item['action'])) ? $item['action'] : null;
            $session->no_care_provided = ($item['is_no_care_provided'] && empty($formattedList));
            $session->reason_for_change = (! Helpers::IsNullOrEmpty($item['change_reason'])) ? $item['change_reason'] : 'NONE';
            $session->reason_for_late_change = (! Helpers::IsNullOrEmpty($item['reason_late_change'])) ? $item['reason_late_change'] : null;
            $session->reason_for_no_change = (! Helpers::IsNullOrEmpty($item['reason_no_change'])) ? $item['reason_no_change'] : null;
            $session->sessions = $formattedList;
            $session->submission_type = '1';
            $session->patch_updated_at = $patch_updated_date;

            // set history
            $session->status_history = [
                [
                    'time_stamp' => Carbon::now(),
                    'status' => CCSType::SESSION_REPORT_STATUS['NONE'],
                ]
            ];

            // update attendance table
            if (!empty($formattedList))
            {
                app("Kinderm8\\{$attendance_model}")
                    ->where('organization_id', $session->organization_id)
                    ->where('branch_id', $session->branch_id)
                    ->where('child_id', $session->child_id)
                    ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
                    ->whereIn('date', array_map(function($item) { return $item['date']; }, $formattedList))
                    ->update([ 'ccs_submitted' => true ]);
            }

            $session->save();

            // get the first record for reference
            if($key === 0) $first_session_report = $session;
        }

        return $first_session_report;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $submission = $this->submission->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $submission->with($depends);
        }

        $submission = $submission->first();

        if (is_null($submission))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $submission;
    }

    /**
     * @param $enrolment_reference
     * @param array $depends
     * @return Collection
     * @throws ResourceNotFoundException
     */
    public function findByEnrolmentId($enrolment_reference, array $depends)
    {
        $submissions = $this->submission->whereIn('enrolment_id', $enrolment_reference);

        // attach relationship data
        if(!empty($depends))
        {
            $submissions->with($depends);
        }

        $submissions = $submissions->get();

        if ($submissions->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $submissions;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param Model|null $authUser
     * @param string $attendance_model
     * @return mixed
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function update(string $id, Request $request, ?Model $authUser, string $attendance_model)
    {
        // check auth user
        if (is_null($authUser->branch) || is_null($authUser->branch->providerService) || is_null($authUser->branch->providerService->address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.provider_service_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $physical_address = array_values(array_filter(array_map(function($item) { return $item['type'] === 'ZPHYSICAL' ? $item : ''; }, $authUser->branch->providerService->address)));

        // check if physical address available
        if (empty($physical_address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.physical_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // get submission
        $session = $this->findById($id, []);

        // map session values
        $formattedList = $this->formatSessions($request->input('sessions'), $physical_address);

        // update
        $session->sessions = $formattedList;

        // update history
        $history = $session->status_history;

        array_unshift($history,  [
            'time_stamp' => Carbon::now(),
            'status' => CCSType::SESSION_REPORT_STATUS['NONE'],
        ]);

        $session->status_history = $history;

        // update attendance table
        app("Kinderm8\\{$attendance_model}")
            ->where('organization_id', $session->organization_id)
            ->where('branch_id', $session->branch_id)
            ->where('child_id', $session->child_id)
            ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
            ->whereIn('date', array_map(function($item) { return $item['date']; }, $formattedList))
            ->update([ 'ccs_submitted' => true ]);

        $session->update();

        return $session;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $attendance_model
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function withdraw(string $id, Request $request, string $attendance_model)
    {
        $object = $this->findById($id, ['creator', 'enrolment']);

        $object->reason_for_change = $request->input('reason');
        $object->reason_for_late_withdrawal = $request->input('late_reason');
        $object->status = array_keys(CCSType::CCS_STATUS_MAP)[10];
        $object->is_withdrawal_processed = false;
        $object->resubmitted_on = null;
        $object->is_synced = '0';

        $object->update();

        // update attendance
        app("Kinderm8\\{$attendance_model}")
            ->where('organization_id', $object->organization_id)
            ->where('branch_id', $object->branch_id)
            ->where('child_id', $object->child_id)
            ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
            ->whereIn('date', array_map(function($item) { return $item['date']; }, $object->sessions))
            ->update([ 'ccs_submitted' => false ]);

        return $object;
    }

    /**
     * @param string $id
     * @param string $attendance_model
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id, string $attendance_model)
    {
        $rowObj = $this->findById($id, []);

        // reset any resubmitted reference
        $this->submission
            ->where('organization_id', $rowObj->organization_id)
            ->where('branch_id', $rowObj->branch_id)
            ->where('child_id', $rowObj->child_id)
            ->where('id', $rowObj->resubmitted_parent)
            ->update([
                'resubmitted_on' => null,
                'is_withdrawal_processed' => false
            ]);

        // update attendance
        app("Kinderm8\\{$attendance_model}")
            ->where('organization_id', $rowObj->organization_id)
            ->where('branch_id', $rowObj->branch_id)
            ->where('child_id', $rowObj->child_id)
            ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
            ->whereIn('date', array_map(function($item) { return $item['date']; }, $rowObj->sessions))
            ->update([ 'ccs_submitted' => false ]);

        $rowObj->delete();

        return true;
    }

    /**
     * @param array $list
     */
    public function bulkUpdateStatus(array $list)
    {
        $this->batchService->update(
            new $this->submission,
            $list,
            'id');
    }

    /**
     * @param Request $request
     * @param Model|null $authUser
     * @param string $attendance_model
     * @return mixed
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function recreate(Request $request, ?Model $authUser, string $attendance_model)
    {
        // check auth user
        if (is_null($authUser->branch) || is_null($authUser->branch->providerService) || is_null($authUser->branch->providerService->address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.provider_service_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        $physical_address = array_values(array_filter(array_map(function($item) { return $item['type'] === 'ZPHYSICAL' ? $item : ''; }, $authUser->branch->providerService->address)));

        // check if physical address available
        if (empty($physical_address))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.physical_address_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // map and set session values
        $formattedList = $this->formatSessions($request->input('sessions'), $physical_address);

        // get submission
        $session = $this->findById(Helpers::decodeHashedID($request->input('id')), []);

        $session->resubmitted_on = now();
        $session->sessions = $formattedList;
        $session->no_care_provided = empty($formattedList);
        $session->action = !empty($formattedList) ? array_keys(CCSType::SESSION_SUBMISSION_ACTION)[0] : array_keys(CCSType::SESSION_SUBMISSION_ACTION)[3];
        $session->status = array_keys(CCSType::SESSION_REPORT_STATUS)[0];
        $session->is_synced = '0';
        $session->resubmitted_on = null;
        $session->resubmitted_parent = $session->id;
        $session->status_history = [
            [
                'time_stamp' => Carbon::now(),
                'status' => CCSType::SESSION_REPORT_STATUS['NONE'],
            ]
        ];

        // update attendance table
        app("Kinderm8\\{$attendance_model}")
            ->where('organization_id', $session->organization_id)
            ->where('branch_id', $session->branch_id)
            ->where('child_id', $session->child_id)
            ->whereRaw("((type = '0' AND pick_time IS NOT NULL) OR type = '1')")
            ->whereIn('date', array_map(function($item) { return $item['date']; }, $formattedList))
            ->update([ 'ccs_submitted' => true ]);

        // update session with new values
        $session->update();

        return $session;
    }

    /**
     * @param array $list
     * @param array $physical_address
     * @return array
     */
    private function formatSessions(array $list, array $physical_address)
    {
        $formattedList = [];

        foreach ($list as $item)
        {
            // remove attribute
            if (array_key_exists('isPreSchoolProgram', $item) && Helpers::IsNullOrEmpty($item['isPreSchoolProgram'])) unset($item['isPreSchoolProgram']);

            $item['bookingId'] = Helpers::decodeHashedID($item['bookingId']);
            $item['absenceReason'] = (! Helpers::IsNullOrEmpty($item['absenceReason'])) ? $item['absenceReason'] : '';
            $item['sessionUnitOfMeasure'] = (! Helpers::IsNullOrEmpty($item['sessionUnitOfMeasure'])) ? CCSType::ENROLMENT_SESSION_UNIT_OF_MEASURE_MAP[$item['sessionUnitOfMeasure']] : '';
            $item['isOtherSubsidyApplied'] = false;
            $item['educatorPersonID'] = '';
            $item['transportOnlySession'] = false;

            $item['addressStreetLine1'] = $physical_address[0]['streetline1'];
            $item['addressStreetLine2'] = $physical_address[0]['streetline2'];
            $item['addressSuburb'] = $physical_address[0]['suburb'];
            $item['addressState'] = $physical_address[0]['state'];
            $item['addressPostcode'] = $physical_address[0]['postcode'];

            array_push($formattedList, $item);
        }

        return $formattedList;
    }
}
