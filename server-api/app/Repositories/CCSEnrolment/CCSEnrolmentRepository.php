<?php

namespace Kinderm8\Repositories\CCSEnrolment;

use Carbon\Carbon;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\CCSEnrolment;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class CCSEnrolmentRepository implements ICCSEnrolmentRepository
{
    use UserAccessibility;

    private $enrolment;

    public function __construct(CCSEnrolment $enrolment)
    {
        $this->enrolment = $enrolment;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->enrolment, $method], $args);
    }

    /**
     * @param array $args
     * @param Request $request
     * @param array $depend
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function get(array $args, Request $request, array $depend, bool $withTrashed)
    {
        $enrolments = $this->enrolment->query();

        $enrolments = $this->attachAccessibilityQuery($enrolments);

        if (!empty($depend))
        {
            $enrolments->with($depend);
        }

        if($withTrashed)
        {
            $enrolments->withTrashed();
        }

        if(is_array($args) && !empty($args))
        {
            $enrolments
                ->when(isset($args['reference']), function ($query) use ($args)
                {
                    if (is_array($args['reference']))
                    {
                        return $query->whereIn('id', $args['reference']);
                    }
                    else
                    {
                        return $query->where('id', $args['reference']);
                    }
                })
                ->when(isset($args['enrolment_reference']), function ($query) use ($args)
                {
                    if (is_array($args['enrolment_reference']))
                    {
                        return $query->whereIn('enrolment_id', $args['enrolment_reference']);
                    }
                    else
                    {
                        return $query->where('enrolment_id', $args['enrolment_reference']);
                    }
                })
                ->when(isset($args['child']), function ($query) use ($args)
                {
                    return $query->where('child_id', $args['child']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                })
                ->when(isset($args['limit']), function ($query) use ($args)
                {
                    return $query->take($args['limit']);
                });
        }
        // default
        else
        {
            $enrolments->orderBy('id', 'desc');
        }

        return $enrolments->get();
    }

    /**
     * @param Request $request
     * @param Model|null $authUser
     * @return CCSEnrolment
     */
    public function store(Request $request, ?Model $authUser)
    {
        // create enrolment
        $enrolment = new $this->enrolment;

        $enrolment->organization_id = $authUser->organization_id;
        $enrolment->branch_id = $authUser->branch_id;
        $enrolment->created_by = $authUser->id;
        $enrolment->service_id = $authUser->branch->providerService->service_id;

        $enrolment->child_id = Helpers::decodeHashedID($request->input('child'));
        $enrolment->parent_id = (! Helpers::IsNullOrEmpty($request->input('individual'))) ? Helpers::decodeHashedID($request->input('individual')) : null;

        $enrolment->arrangement_type = $request->input('arrangement_type');
        $enrolment->session_routine = $this->mapSessions($request->input('sessions'));
        $enrolment->number_weeks_cycle = (! Helpers::IsNullOrEmpty($request->input('weeks_cycle'))) ? $request->input('weeks_cycle') : null;

        $enrolment->enrollment_start_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_start'))) ? $request->input('enrollment_start') : null;
        $enrolment->enrollment_end_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_end'))) ? $request->input('enrollment_end') : null;
        $enrolment->late_submission_reason = (! Helpers::IsNullOrEmpty($request->input('late_submission'))) ? $request->input('late_submission') : null;
        $enrolment->arrangement_type_note = (! Helpers::IsNullOrEmpty($request->input('arrangement_type_note'))) ? $request->input('arrangement_type_note') : null;
        $enrolment->session_type = (! Helpers::IsNullOrEmpty($request->input('session_type'))) ? $request->input('session_type') : null;
        $enrolment->session_type_state = $request->input('session_is_case');
        $enrolment->signing_party = (! Helpers::IsNullOrEmpty($request->input('signing_party'))) ? $request->input('signing_party') : '0';
        $enrolment->signing_party_individual_first_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_first_name'))) ? $request->input('signing_party_first_name') : null;
        $enrolment->signing_party_individual_last_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_last_name'))) ? $request->input('signing_party_last_name') : null;
        $enrolment->number_weeks_cycle = (! Helpers::IsNullOrEmpty($request->input('weeks_cycle'))) ? $request->input('weeks_cycle') : null;
        $enrolment->is_case_details = (! Helpers::IsNullOrEmpty($request->input('is_case_details'))) ? $request->input('is_case_details') : null;
        $enrolment->notes = (! Helpers::IsNullOrEmpty($request->input('notes'))) ? $request->input('notes') : null;
        $enrolment->parent_status = ($enrolment->signing_party === '0') ? '1' : '0';
        $enrolment->reason_for_pea = ($enrolment->arrangement_type === array_keys(CCSType::ENROLMENT_ARRANGEMENT_TYPE)[3])
            ? ((! Helpers::IsNullOrEmpty($request->input('reason_for_pea'))) ? $request->input('reason_for_pea') : array_keys(CCSType::ENROLMENT_PEA_REASON)[0])
            : array_keys(CCSType::ENROLMENT_PEA_REASON)[0];

        // set history
        $enrolment->status_history = [
            [
                'time_stamp' => Carbon::now(),
                'description' => 'enrolment created',
                'status_text' => '',
                'reason' => '',
                'status' => CCSType::CCS_STATUS_MAP['NONE'],
                'user' => [
                    'id' => $authUser->id,
                    'name' => $authUser->full_name
                ]
            ]
        ];

        $enrolment->save();

        return $enrolment;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $enrolment = $this->enrolment->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $enrolment->with($depends);
        }

        $enrolment = $enrolment->first();

        if (is_null($enrolment))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $enrolment;
    }

    /**
     * @param $enrol_id
     * @param bool $withTrashed
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByEnrolmentId($enrol_id, bool $withTrashed)
    {
        $enrolment = $this->enrolment->where('enrolment_id', $enrol_id);

        if($withTrashed)
        {
            $enrolment->withTrashed();
        }

        $enrolment = $enrolment->first();

        if (is_null($enrolment))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $enrolment;
    }

    /**
     * @param string $status
     * @param bool $withTrashed
     * @param bool $throwable
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByStatus(string $status, bool $withTrashed, bool $throwable)
    {
        $enrolments = $this->enrolment->where('enrolment_id', $status);

        // access
        $enrolments = $this->attachAccessibilityQuery($enrolments);

        if ($withTrashed)
        {
            $enrolments->withTrashed();
        }

        $enrolments = $enrolments->get();

        if ($throwable && $enrolments->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $enrolments;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request)
    {
        // check item exists
        $enrolment = $this->findById($id, ['child', 'parent']);

        $enrolment->parent_id = (! Helpers::IsNullOrEmpty($request->input('individual'))) ? Helpers::decodeHashedID($request->input('individual')) : null;
        $enrolment->arrangement_type = $request->input('arrangement_type');
        $enrolment->session_routine = $this->mapSessions($request->input('sessions'));
        $enrolment->number_weeks_cycle = (! Helpers::IsNullOrEmpty($request->input('weeks_cycle'))) ? $request->input('weeks_cycle') : null;

        $enrolment->enrollment_start_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_start'))) ? $request->input('enrollment_start') : null;
        $enrolment->enrollment_end_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_end'))) ? $request->input('enrollment_end') : null;
        $enrolment->late_submission_reason = (! Helpers::IsNullOrEmpty($request->input('late_submission'))) ? $request->input('late_submission') : null;
        $enrolment->arrangement_type_note = (! Helpers::IsNullOrEmpty($request->input('arrangement_type_note'))) ? $request->input('arrangement_type_note') : null;
        $enrolment->session_type = (! Helpers::IsNullOrEmpty($request->input('session_type'))) ? $request->input('session_type') : null;
        $enrolment->session_type_state = $request->input('session_is_case');
        $enrolment->signing_party = (! Helpers::IsNullOrEmpty($request->input('signing_party'))) ? $request->input('signing_party') : '0';
        $enrolment->signing_party_individual_first_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_first_name'))) ? $request->input('signing_party_first_name') : null;
        $enrolment->signing_party_individual_last_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_last_name'))) ? $request->input('signing_party_last_name') : null;
        $enrolment->is_case_details = (! Helpers::IsNullOrEmpty($request->input('is_case_details'))) ? $request->input('is_case_details') : null;
        $enrolment->notes = (! Helpers::IsNullOrEmpty($request->input('notes'))) ? $request->input('notes') : null;
        $enrolment->reason_for_pea = ($enrolment->arrangement_type === array_keys(CCSType::ENROLMENT_ARRANGEMENT_TYPE)[3])
            ? ((! Helpers::IsNullOrEmpty($request->input('reason_for_pea'))) ? $request->input('reason_for_pea') : array_keys(CCSType::ENROLMENT_PEA_REASON)[0])
            : array_keys(CCSType::ENROLMENT_PEA_REASON)[0];

        $enrolment->save();

        // if model has changes
        if (!empty($enrolment->getChanges()))
        {
            // update history
            $history = is_null($enrolment->status_history) ? [] : $enrolment->status_history;

            array_unshift($history, [
                'time_stamp' => Carbon::now(),
                'description' => 'enrolment updated',
                'status_text' => '',
                'reason' => '',
                'status' => CCSType::CCS_STATUS_MAP[$enrolment->status],
                'user' => [
                    'id' => auth()->user()->id,
                    'name' => auth()->user()->full_name
                ]
            ]);

            $enrolment->status_history = $history;

            $enrolment->update();
        }

        return [
            'item' => $enrolment,
            'updated' => !empty($enrolment->getChanges())
        ];
    }

    /**
     * @param string $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateParentStatus(string $id)
    {
        // check item exists
        $enrolment = $this->findById($id, ['child', 'parent']);

        $enrolment->parent_status = 2;

        $enrolment->save();

        return $enrolment;
    }

    /**
     * @param string $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $rowObj = $this->findById($id, []);

        if ($rowObj->deleted_at != null)
        {
            $rowObj->forceDelete();
        }
        else
        {
            $rowObj->delete();
        }

        return $rowObj;
    }

    /**
     * @param string $id
     * @param string|null $type
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function submit(string $id, ?string $type, Request $request)
    {
        // check if user has personal id
        if(is_null(auth()->user()->ccs_id))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('enrolment.personal_id_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // get enrolment
        $enrolment = $this->findById($id, ['child', 'parent']);

        $enrolment->parent_id = (! Helpers::IsNullOrEmpty($request->input('individual'))) ? Helpers::decodeHashedID($request->input('individual')) : null;
        $enrolment->arrangement_type = $request->input('arrangement_type');
        $enrolment->session_routine = $this->mapSessions($request->input('sessions'));
        $enrolment->number_weeks_cycle = (! Helpers::IsNullOrEmpty($request->input('weeks_cycle'))) ? $request->input('weeks_cycle') : null;

        $enrolment->enrollment_start_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_start'))) ? $request->input('enrollment_start') : null;
        $enrolment->enrollment_end_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_end'))) ? $request->input('enrollment_end') : null;
        $enrolment->late_submission_reason = (! Helpers::IsNullOrEmpty($request->input('late_submission'))) ? $request->input('late_submission') : null;
        $enrolment->arrangement_type_note = (! Helpers::IsNullOrEmpty($request->input('arrangement_type_note'))) ? $request->input('arrangement_type_note') : null;
        $enrolment->session_type = (! Helpers::IsNullOrEmpty($request->input('session_type'))) ? $request->input('session_type') : null;
        $enrolment->session_type_state = $request->input('session_is_case');
        $enrolment->signing_party = (! Helpers::IsNullOrEmpty($request->input('signing_party'))) ? $request->input('signing_party') : '0';
        $enrolment->signing_party_individual_first_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_first_name'))) ? $request->input('signing_party_first_name') : null;
        $enrolment->signing_party_individual_last_name = (! Helpers::IsNullOrEmpty($request->input('signing_party_last_name'))) ? $request->input('signing_party_last_name') : null;
        $enrolment->is_case_details = (! Helpers::IsNullOrEmpty($request->input('is_case_details'))) ? $request->input('is_case_details') : null;
        $enrolment->notes = (! Helpers::IsNullOrEmpty($request->input('notes'))) ? $request->input('notes') : null;
        $enrolment->reason_for_pea = ($enrolment->arrangement_type === array_keys(CCSType::ENROLMENT_ARRANGEMENT_TYPE)[3])
            ? ((! Helpers::IsNullOrEmpty($request->input('reason_for_pea'))) ? $request->input('reason_for_pea') : array_keys(CCSType::ENROLMENT_PEA_REASON)[0])
            : array_keys(CCSType::ENROLMENT_PEA_REASON)[0];

        $enrolment->created_by = auth()->user()->id;

        $enrolment->status = !is_null($type) ? 'RE_ENROL' : (is_null($enrolment->enrolment_id) ? 'PENDIN' : $enrolment->status);

        // reset sync on submit
        $enrolment->is_synced = '0';

        // update history values
        $history = !is_null($enrolment->status_history) ? $enrolment->status_history : [];

        array_unshift($history, [
            'time_stamp' => Carbon::now(),
            'description' => is_null($enrolment->enrolment_id) ? 'enrolment submitted' : ($enrolment->isEnrolmentClosed() ? 're-enrol (200A)' : 'enrolment resubmitted (update)'),
            'status_text' => '',
            'reason' => '',
            'status' => CCSType::CCS_STATUS_MAP[$enrolment->status],
            'user' => [
                'id' => auth()->user()->id,
                'name' => auth()->user()->full_name
            ]
        ]);

        $enrolment->status_history = $history;

        $enrolment->save();

        return $enrolment;
    }

    /**
     * @param Request $request
     * @param Model $branch
     * @param Model $user
     * @return bool
     */
    public function migrate(Request $request, Model $branch, Model $user)
    {
        foreach ($request->input('list') as $item)
        {
            $this->enrolment->updateOrCreate(
                [
                    'organization_id' => $branch->organization_id,
                    'branch_id' => $branch->id,
                    'service_id' => $branch->providerService->service_id,
                    'child_id' => Helpers::decodeHashedID($item['child']),
                    'enrolment_id' => $item['enrol_id']
                ],
                [
                    'created_by' => $user->id,
                    'status' => $item['status'],
                    'arrangement_type' => $item['arrangement_type'],
                    'session_routine' => $item['sessions'],
                    'initial_session_routine' => $item['initial_sessions'],
                    'enrollment_start_date' => $item['enrollment_start'],
                    'parent_id' => (! Helpers::IsNullOrEmpty($item['individual'])) ? Helpers::decodeHashedID($item['individual']) : null,
                    'enrollment_end_date' => (! Helpers::IsNullOrEmpty($item['enrollment_end'])) ? $item['enrollment_end'] : null,
                    'number_weeks_cycle' => (! Helpers::IsNullOrEmpty($item['weeks_cycle'])) ? $item['weeks_cycle'] : null,
                    'late_submission_reason' => (! Helpers::IsNullOrEmpty($item['late_submission'])) ? $item['late_submission'] : null,
                    'arrangement_type_note' => (! Helpers::IsNullOrEmpty($request->input('arrangement_type_note'))) ? $request->input('arrangement_type_note') : null,
                    'session_type' => (! Helpers::IsNullOrEmpty($item['session_type'])) ? $item['session_type'] : null,
                    'session_type_state' =>  $item['session_is_case'],
                    'signing_party' => (! Helpers::IsNullOrEmpty($item['signing_party'])) ? $item['signing_party'] : '0',
                    'signing_party_individual_first_name' => (! Helpers::IsNullOrEmpty($item['signing_party_first_name'])) ?  $item['signing_party_first_name'] : null,
                    'signing_party_individual_last_name' => (! Helpers::IsNullOrEmpty($item['signing_party_last_name'])) ?  $item['signing_party_last_name'] : null,
                    'is_case_details' => (! Helpers::IsNullOrEmpty($item['is_case_details'])) ? $item['is_case_details'] : null,
                    'notes' => (! Helpers::IsNullOrEmpty($item['notes'])) ? $item['notes'] : null,
                    'status_history' => [
                        [
                            'time_stamp' => Carbon::now(),
                            'description' => 'enrolment imported',
                            'status_text' => '',
                            'reason' => '',
                            'status' => CCSType::CCS_STATUS_MAP[$item['status']],
                            'user' => [
                                'id' => $user->id,
                                'name' => $user->full_name
                            ]
                        ]
                    ],
                    'parent_status' => '2',
                    'is_synced' => '1'
                ]
            );
        }

        return true;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function close(string $id, Request $request)
    {
        // check item exists
        $enrolment = $this->findById($id, ['child', 'parent']);

        $enrolment->enrollment_end_date = (! Helpers::IsNullOrEmpty($request->input('enrollment_end'))) ? $request->input('enrollment_end') : null;

        // update history
        $history = is_null($enrolment->status_history) ? [] : $enrolment->status_history;

        array_unshift($history, [
            'time_stamp' => Carbon::now(),
            'description' => 'end enrolment',
            'status_text' => '',
            'reason' => '',
            'status' => CCSType::CCS_STATUS_MAP[$enrolment->status],
            'user' => [
                'id' => auth()->user()->id,
                'name' => auth()->user()->full_name
            ]
        ]);

        $enrolment->status_history = $history;

        $enrolment->update();

        return $enrolment;
    }

    /**
     * @param array $list
     * @return array
     */
    private function mapSessions(array $list)
    {
        $formattedList = [];

        foreach ($list as $item)
        {
            $item['cycleWeekNumber'] = (! Helpers::IsNullOrEmpty($item['cycleWeekNumber'])) ? $item['cycleWeekNumber'] : '';
            $item['sessionType'] = (!is_null($item['sessionType'])) ? CCSType::ENROLMENT_SESSION_TYPE_MAP[$item['sessionType']] : '';
            $item['sessionUnitOfMeasure'] = (!is_null($item['sessionUnitOfMeasure'])) ? CCSType::ENROLMENT_SESSION_UNIT_OF_MEASURE_MAP[$item['sessionUnitOfMeasure']] : '';

            array_push($formattedList, $item);
        }

        return $formattedList;
    }

    /**
     * @param Request $request
     * @param array $child_data
     * @return array
     */
    public function CCSEnrolmentReport(Request $request, array $child_data)
    {
        $actual_count = null;

        if($child_data['isRoomSelect'])
        {
            $enrolment = $this->enrolment->with(['child', 'parent'])->whereIn('child_id', $child_data['id']);
        }
        else
        {
            $enrolment = $this->enrolment->with(['child', 'parent']);
        }

        $enrolment = $this->attachAccessibilityQuery($enrolment);

        if($request->input('enrolment_type')) {

            $enrolment = $enrolment->where('arrangement_type', $request->input('enrolment_type'));
        }

        if($request->input('enrolment_status')) {

            $enrolment = $enrolment->where('status', $request->input('enrolment_status'));
        }

        if($request->input('created_date_start')) {

            $enrolment = $enrolment->whereDate('created_at', '>=', $request->input('created_date_start'));

        }

        if($request->input('created_date_end')){

            $enrolment = $enrolment->whereDate('created_at', '<=', $request->input('created_date_end'));
        }

        if($request->input('enrolment_date_start')) {


            $enrolment = $enrolment->whereDate('enrollment_start_date', '>=',  $request->input('enrolment_date_start'));

        }

        if($request->input('enrolment_date_end')){

            $enrolment = $enrolment->whereDate('enrollment_start_date', '<=',  $request->input('enrolment_date_end'));
        }

        $actual_count = $enrolment->get()->count();

        $enrolment = $enrolment->get();

        return [
            'list'=>$enrolment,
            'actual_count' => $actual_count
        ];
    }
}
