<?php

namespace Kinderm8\Repositories\Attendance;

use Carbon\Carbon;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\ChildAttendance;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use DateTimeHelper;
use function foo\func;
use DateTime;
use Log;

class AttendanceRepository implements IAttendanceRepository
{
    use UserAccessibility;

    private $attendance;
    private $userTimezone;

    public function __construct(ChildAttendance $attendance)
    {
        $this->attendance = $attendance;
        $this->userTimezone = (auth()->check())? auth()->user()->timezone : null;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->attendance, $method], $args);
    }

    /**
     * @param $args
     * @param Request $request
     * @param string $booking_model
     * @return Builder[]|Collection
     */
    public function weekList($args, Request $request, string $booking_model)
    {
        $child_id = Helpers::decodeHashedID($request->input('id'));

        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : Carbon::now($this->userTimezone)->startOfWeek()->format('Y-m-d');
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : Carbon::now($this->userTimezone)->endOfWeek()->format('Y-m-d');

        //get bookings with attendance
        $attendances = app("Kinderm8\\{$booking_model}")->with(['child', 'room', 'fee', 'attendance', 'attendance.dropper', 'attendance.picker']);

        //access
        $attendances = $this->attachAccessibilityQuery($attendances);

        return $attendances
            ->where('child_id', $child_id)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date', 'ASC')
            ->get();
    }

    /**
     * @param Request $request
     * @param $child_ref
     * @param string $booking_model
     * @param array $args
     * @param array $depends
     * @param bool $throwable
     * @return Builder[]|Collection
     * @throws Exception
     */
    public function getBookingAttendance(Request $request, $child_ref, string $booking_model, array $args, array $depends, bool $throwable)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $attendances = app("Kinderm8\\{$booking_model}")
            ->with(!empty($depends) ? $depends : ['child', 'room', 'fee', 'attendance', 'attendance.dropper', 'attendance.picker'])
            ->when($child_ref instanceof Model, function ($query) use ($child_ref)
            {
                return $query->where('child_id', $child_ref->id);
            })
            ->when($child_ref instanceof Collection, function ($query) use ($child_ref)
            {
                return $query->whereIn('child_id', $child_ref->pluck('id'));
            })
            ->when(!is_null($start) && !is_null($end), function ($query) use ($start, $end)
            {
                return $query->whereBetween('date', [$start, $end]);
            });

        // access
        $attendances = $this->attachAccessibilityQuery($attendances);

        if (is_array($args) && !empty($args))
        {
            $attendances
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['between_dates']) && is_array($args['between_dates']) && !empty($args['between_dates']), function ($query) use ($args)
                {
                    return $query->whereBetween('date', $args['between_dates']);
                })
                ->when(isset($args['month']) && !is_null($args['month']), function ($query) use ($args)
                {
                    return $query->whereRaw('EXTRACT(MONTH FROM date) = ?', [ $args['month'] ]);
                })
                ->when(isset($args['year']) && !is_null($args['year']), function ($query) use ($args)
                {
                    return $query->whereRaw('EXTRACT(YEAR FROM date) = ?', [ $args['year'] ]);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }

        $attendances = $attendances
            ->orderBy('date', 'ASC')
            ->orderBy('session_start', 'ASC')
            ->get();

        // check if records available
        if ($throwable && $attendances->count() < 1)
        {
            throw new Exception(LocalizationHelper::getTranslatedText('session-submission.sessions_not_found'), ErrorType::CustomValidationErrorCode);
        }

        return $attendances;
    }

    /**
     * @param Request $request
     * @param string|null $booking_model
     * @return array
     * @throws BindingResolutionException
     */
    public function getBookingAttendanceForReport(Request $request, ?string $booking_model)
    {
        $default_end = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));
        $default_start = '1900-01-01';

        $start = (! Helpers::IsNullOrEmpty($request->input('sdate'))) ? $request->input('sdate') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('edate'))) ? $request->input('edate') : null;

        $attendances = app("Kinderm8\\{$booking_model}")
            ->with(['child', 'room', 'fee', 'attendance', 'attendance.dropper', 'attendance.picker']);

        $attendances = $this->attachAccessibilityQuery($attendances);

        if($request->input('filterBy') === 'CHILD')
        {
            $child_array =  [];
            $in_active_child = [];

            foreach($request->input('child') as $childList) {
                $id = Helpers::decodeHashedID($childList);
                array_push($child_array, $id);
            }

            if($request->input('status_toggle')) {

                $in_active_child = $this->getInActiveChild($request, 'Child');
            }

            $child_array = array_merge($child_array,$in_active_child);

            $attendances = $attendances->whereHas('attendance', function($query) use($child_array) {
                $query->whereIn('child_id', $child_array);
            });

        }
        else {
            $room_array = [];
            foreach($request->input('room') as $roomList) {
                $id = Helpers::decodeHashedID($roomList);
                array_push($room_array, $id);
            }
            $attendances = $attendances->whereHas('attendance', function($query) use($room_array) {
                $query->whereIn('room_id', $room_array);
            });
        }
        $attendances =  $attendances
            ->whereBetween('date', [$end? $end : $default_start, $start? $start : $default_end])
            ->orderBy('date', 'ASC')
            ->orderBy('session_start', 'ASC')
            ->get();

            return [
                'list' => $attendances,
                'actual_count' => $attendances->count(),
            ];
    }

    /**
     * @param $ids
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function getById($ids, string $childnote_model)
    {
        $attendances = $this->attendance->with(['picker','dropper'])->whereIn('id', $ids)->get();

        return $this->formatAttendanceObject($attendances, $childnote_model);
    }

    /**
     * @param Request $request
     * @param Collection|null $children
     * @param array $depends
     * @param bool $withTrashed
     * @return Builder
     */
    public function findByChildren(Request $request, ?Collection $children, array $depends, bool $withTrashed)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $list = $this->attendance
            ->whereIn('child_id', $children->pluck('id')->toArray())
            ->when(!is_null($end), function ($query) use ($start, $end)
            {
                return $query->whereBetween('date', [$start, $end]);
            },
            function ($query) use ($start)
            {
                return $query->where('date', $start);
            });

        if(!empty($depends))
        {
            $list->with($depends);
        }

        if($withTrashed)
        {
            $list->withTrashed();
        }

        $list = $this->attachAccessibilityQuery($list);

        return $list->get();
    }

    /**
     * @param Request $request
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function getByDay(Request $request, $child_id, string $childnote_model)
    {
        $date = ($request->input('date'))? $request->input('date') : strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));
        $branch_id = (!Helpers::IsNullOrEmpty($request->input('branch_id')))? Helpers::decodeHashedID($request->input('branch_id')) : auth()->user()->branch_id;

        $attendance = $this->attendance->with(['picker','dropper'])->where('date', $date);

        if($child_id != '')
        {
            $attendance = $attendance->where('child_id', '=', $child_id);
        }

        $attendance = $attendance
            ->where('organization_id', '=', auth()->user()->organization_id)
            ->where('branch_id', '=', $branch_id)
            ->get();

        if($child_id == '')
        {
            $attendance = $attendance->where('child.status','=', '1');
        }


        return $this->formatAttendanceObject($attendance, $childnote_model);
    }

    /**
     * @param Request $request
     * @param string $child_model
     * @param string $childnote_model
     * @param string $booking_model
     * @return array
     * @throws Exception
     */
    public function createAttendance(Request $request, string $child_model, string $childnote_model, string $booking_model)
    {
        $organization_id = auth()->user()->organization_id;
        $branch_id = auth()->user()->branch_id;
        $user = auth()->user()->id;

        $booking_ids = json_decode($request->input('booking_id'));
        if(!is_array($booking_ids)){
            $booking_ids = array($request->input('booking_id'));
        }
        $child_ids = json_decode($request->input('child_id'));
        $ids = json_decode($request->input('attendance_ids'));
        $type = $request->input('type');   // 0 - attendance. 1 - absence
        $absence_reason = $request->input('absence_reason');
        $absence_note = $request->input('absence_note');

        $drop_geocoordinates = $request->input('drop_geo_coordinates');
        $drop_signature = $request->input('drop_signature');
        $pick_geocoordinates = $request->input('pick_geo_coordinates');
        $pick_signature = $request->input('pick_signature');

        $remark = $request->input('remark');
        $current_time = Carbon::now($this->userTimezone);

        $time = ($request->input('time'))? $request->input('time'): $current_time->format('H:i');
        $device_time =  $this->timeToMinute($time);
        $date = strtolower($current_time->format('Y-m-d'));

        $success_records = array();
        $i = 0;

        foreach($child_ids as $child_id) {

            $child = app("Kinderm8\\{$child_model}")->find($child_id);

            if($child != null) {
                if ($ids == '' || $ids == null) {
                    // drop

                    $booking_id = Helpers::decodeHashedID($booking_ids[$i]);
                    $bookings = app("Kinderm8\\{$booking_model}")->where('date', '=', $date)->where('id', '=', $booking_id)->count();
                    if($bookings == 0){
                        return array(
                            'status' => 'booking not found '. $booking_ids[$i],
                            'attendance_ids' => $success_records
                        );
                    }

                    $day = date("l");
                    $is_extra_day = 1;

                    foreach ($child->attendance as $attendance) {
                        if ($attendance['name'] == strtolower($day)) {
                            $is_extra_day = 0;
                        }
                    }

                    // check for non pick records
                    $drop_record = $this->attendance->select('id')
                        ->where('child_id', '=', $child_id)
                        ->where('booking_id', '=', $booking_id)
                        ->whereNull('pick_time')
                        ->whereDate('date', $date)
                        ->orderBy('id', 'DESC')
                        ->first();

                    if ($drop_record) {
                        // already dropped
                        $attendance_id = $drop_record->id;
                        $status = 'Child already dropped';
                    } else {
                        if ($remark != null && $remark != "") {
                            $child_note = app("Kinderm8\\{$childnote_model}");
                            $child_note->child_id = $child_id;
                            $child_note->user_id = $user;
                            $child_note->note = $remark;
                            $child_note->created_at = $current_time;
                            $child_note->updated_at = $current_time;
                            $child_note->save();

                            $child_note_id = $child_note->id;
                        } else {
                            $child_note_id = null;
                        }

                        if($type == 1){
                            $status = 2;
                        }else{
                            $status = 1;
                            $absence_reason = 'NONE';
                        }

                        app("Kinderm8\\{$booking_model}")->where('id', $booking_id)
                            ->where('child_id', $child_id)
                            ->where('organization_id', $organization_id)
                            ->where('branch_id', $branch_id)
                            ->update([
                                'status' => $status,
                                'absence_reason' => $absence_reason
                            ]);

                        $attendance = new $this->attendance;
                        $attendance->organization_id = $organization_id;
                        $attendance->branch_id = $branch_id;
                        $attendance->child_id = $child_id;
                        $attendance->booking_id = $booking_id;
                        $attendance->date = $date;//strtolower(new DateTime($request->input('time')->format('Y-m-d')));//$date;
                        $attendance->drop_user = ($type == '0')? $user: null;
                        $attendance->drop_time = ($type == '0')? $device_time: null;
                        $attendance->drop_geo_coordinates = ($type == '0')? $drop_geocoordinates: null;
                        $attendance->drop_signature = ($type == '0')? $drop_signature: null;
                        $attendance->drop_child_note_id = $child_note_id;
                        $attendance->pick_user = null;
                        $attendance->pick_time = null;
                        $attendance->pick_geo_coordinates = null;
                        $attendance->pick_signature = null;
                        $attendance->pick_child_note_id = null;
                        $attendance->is_extra_day = $is_extra_day;
                        $attendance->ccs_submitted = false;
                        $attendance->type = $type;
                        $attendance->absence_note = $absence_note;
                        $attendance->deleted_at = null;
                        $attendance->created_at = $current_time;
                        $attendance->updated_at = $current_time;
                        $attendance->save();

                        array_push($success_records, $attendance->id);
                        $status = 200;
                    }

                } else {
                    // pick
                    $attendance_id = $ids[$i];
                    // check for non pick records
                    $nonPickCount = $this->attendance->where('id', Helpers::decodeHashedID($attendance_id))
                        ->whereNull('pick_time')
                        ->count();

                    if ($nonPickCount > 0) {
                        // not picked
                        if ($remark != null && $remark != "") {

                            $child_note = app("Kinderm8\\{$childnote_model}");
                            $child_note->child_id = $child_id;
                            $child_note->user_id = $user;
                            $child_note->note = $remark;
                            $child_note->created_at = $current_time;
                            $child_note->updated_at = $current_time;
                            $child_note->save();

                            $child_note_id = $child_note->id;
                        } else {
                            $child_note_id = null;
                        }

                        $attendance = $this->attendance->find(Helpers::decodeHashedID($attendance_id));
                        $attendance->pick_user = $user;
                        $attendance->pick_time = $device_time;
                        $attendance->pick_geo_coordinates = $pick_geocoordinates;
                        $attendance->pick_signature = $pick_signature;
                        $attendance->pick_child_note_id = $child_note_id;
                        $attendance->updated_at = $current_time;
                        $attendance->save();

                        array_push($success_records, $attendance->id);
                        $status = 200;
                    } else {
                        // already picked
                        $status = 'Child already picked';
                    }
                }
            }
            $i++;
        }

        return array(
            'status' => $status,
            'attendance_ids' => $success_records
        );
    }

    /**
     * @param Request $request
     * @param string $booking_model
     * @return array
     */
    public function updateBulkAttendance(Request $request, string $booking_model)
    {
        $added_attendance_ids = [];

        foreach (json_decode(json_encode($request->input('slots'))) as $item)
        {
            if ($item->isNew)
            {
                // update booking as attended
                $booking = app("Kinderm8\\{$booking_model}")
                    ->where('id', Helpers::decodeHashedID($item->booking))
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->where('child_id', Helpers::decodeHashedID($item->child))
                    ->first();

                $booking->status = '1';
                $booking->update();

                // add attendance record
                $attendanceObj = new $this->attendance;
                $attendanceObj->organization_id = auth()->user()->organization_id;
                $attendanceObj->branch_id =  auth()->user()->branch_id;
                $attendanceObj->child_id = Helpers::decodeHashedID($item->child);
                $attendanceObj->booking_id = Helpers::decodeHashedID($item->booking);
                $attendanceObj->date = $item->date;
                $attendanceObj->drop_time = $item->checkInTime;
                $attendanceObj->drop_user = auth()->user()->id;
                $attendanceObj->pick_time = $item->checkOutTime;
                $attendanceObj->pick_user = auth()->user()->id;

                // attach attendance
                $booking->attendance()->save($attendanceObj);

                // attendance reference
                array_push($added_attendance_ids, $attendanceObj->id);
            }
            else
            {
                // update attendance record
                $this->attendance
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->where('booking_id', Helpers::decodeHashedID($item->booking))
                    ->where('child_id', Helpers::decodeHashedID($item->child))
                    ->where('date', $item->date)
                    ->update([
                        'drop_user' => Helpers::decodeHashedID($item->checkInUser),
                        'drop_time' => $item->checkInTime,
                        'pick_user' => Helpers::decodeHashedID($item->checkOutUser),
                        'pick_time' => $item->checkOutTime,
                    ]);
            }
        }

        return $added_attendance_ids;
    }

    /**
     * @param Request $request
     * @param string $child_model
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function getMissedAttendance(Request $request, string $child_model, string $childnote_model){

        $user_id = auth()->user()->id;
        $child_ids = json_decode($request->input('child_ids'));
        $parent_ids = [];
        $children = app("Kinderm8\\{$child_model}")->with(['parents'])
            ->whereHas('parents', function($query) use($user_id) {
                $query->where('user_id', '=', $user_id);
            })
            ->whereIn('id', $child_ids)->get();
        $child_ids = $children->pluck('id');

        $today = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));

        foreach($children as $child){
            foreach($child->parents as $parent) {
                array_push($parent_ids, $parent->id);
            }
        }

        $attendance = $this->attendance->with(['picker','dropper', 'booking','child'])->whereIn('child_id', $child_ids)
            ->where('type', '=', 0)
            ->whereDate('date', '!=', $today)
            ->whereNull('deleted_at')
            ->where(function ($query) use ($parent_ids) {
                $query->where(function ($query){
                    $query->whereNull('drop_time')
                        ->orWhereNull('pick_time');
                })
                ->orWhere(function ($query) use ($parent_ids) {
                    $query->whereNotIn('pick_user', $parent_ids)
                        ->orWhereNotIn('drop_user', $parent_ids);
                });
            })
            ->where(function ($query) {
                $query->whereNull('parent_pick_time')
                    ->whereNull('parent_drop_time');
            })
            ->orderBy('id', 'DESC')
            ->get();

        $temp_attendance = [];
        foreach($attendance as $item){

            if(is_null($item->booking->deleted_at)){
                array_push($temp_attendance, $item);

                foreach($children as $child){
                    if($child['id'] == $item['child_id']){
                        $item['parent_ids'] = $child->parents->pluck('id');
                    }
                }
            }
        }
        $attendance = $temp_attendance;
        $attendance = $this->formatAttendanceObject($attendance, $childnote_model);

        return $attendance;
    }

    /**
     * @param Request $request
     * @param string $child_model
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function updateMissedAttendance(Request $request, string $child_model, string $childnote_model){

        $child_id = json_decode($request->input('child_id'));
        $pick_date = DateTimeHelper::convertTimeStringToMins($request->input('parent_pick_time'));
        $drop_date = DateTimeHelper::convertTimeStringToMins($request->input('parent_drop_time'));
        $attendance_id = Helpers::decodeHashedID($request->input('attendance_id'));
        $parent_ids = [];
        $child = app("Kinderm8\\{$child_model}")->with(['parents'])->where('id', '=',$child_id)->first();

        foreach ($child->parents as $parent) {
            array_push($parent_ids, $parent->id);
        }

        if(count($parent_ids) == 0){
            return array(
                'status' => 'Parent accounts not found for the child'
            );
        }

        $user = auth()->user()->id;
        if(!in_array($user, $parent_ids)){
            return array(
                'status' => 'User is not a parent of the child'
            );
        }

        $now = Carbon::now($this->userTimezone);

        $attendance = $this->attendance->with(['picker','dropper'])->where('id', '=', $attendance_id)->get();

        foreach($attendance as $record) {
            if ($record != null) {
                if ($record['drop_time'] == null || $record['drop_time'] == '') {

                    if (($record['drop_time'] == null || $record['drop_time'] == '') && ($record['parent_drop_time'] == null || $record['parent_drop_time'] != '')) {
                        $record['parent_drop_time'] = $drop_date;
                    } else if (($record['pick_time'] == null || $record['pick_time'] == '') && ($record['parent_pick_time'] == null || $record['parent_pick_time'] == '')) {
                        $record['parent_drop_time'] = $pick_date;
                    }

                    $record['updated_at'] = $now;
                    $record['drop_parent'] = $user;
                    $record->save();

                } else if ($record['pick_time'] == null || $record['pick_time'] == '') {

                    if (in_array($record['drop_user'], $parent_ids)) {

                        if (($record['drop_time'] == null || $record['drop_time'] == '') && ($record['parent_drop_time'] == null || $record['parent_drop_time'] == '')) {
                            $record['parent_pick_time'] = $drop_date;
                        } else if (($record['pick_time'] == null || $record['pick_time'] == '') && ($record['parent_pick_time'] == null || $record['parent_pick_time'] == '')) {
                            $record['parent_pick_time'] = $pick_date;
                        }

                        $record['updated_at'] = $now;
                        $record['pick_parent'] = $user;
                        $record->save();

                    } else {

                        $record['parent_drop_time'] = $drop_date;
                        $record['parent_pick_time'] = $pick_date;
                        $record['updated_at'] = $now;
                        $record['drop_parent'] = $user;
                        $record['pick_parent'] = $user;
                        $record->save();
                    }

                } else if (!in_array($record['drop_user'], $parent_ids) && !in_array($record['pick_user'], $parent_ids)) {

                    $record['parent_drop_time'] = $drop_date;
                    $record['parent_pick_time'] = $pick_date;
                    $record['updated_at'] = $now;
                    $record['drop_parent'] = $user;
                    $record['pick_parent'] = $user;
                    $record->save();

                } else if (!in_array($record['drop_user'], $parent_ids)) {

                    $record['parent_drop_time'] = $drop_date;
                    $record['updated_at'] = $now;
                    $record['drop_parent'] = $user;
                    $record->save();

                } else if (!in_array($record['pick_user'], $parent_ids)) {

                    $record['parent_pick_time'] = $pick_date;
                    $record['updated_at'] = $now;
                    $record['pick_parent'] = $user;
                    $record->save();
                }

            } else {
                return array(
                    'status' => 'Record not Found'
                );
            }
        }
        $attendances = $this->formatAttendanceObject($attendance, $childnote_model);

        return array(
            'status' => '',
            'attendances' => $attendances,
            'attendance_ids' => array($attendance_id)
        );

    }

    /**
     * @param Collection
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function formatAttendanceObject($attendance, string $childnote_model){

        foreach($attendance as $record){
            $record['attendance_id'] = $record['id'];
            $record['booking_index'] = Helpers::hxCode($record['booking_id']);

            if((string)$record->drop_time != null){
                $time = DateTimeHelper::formatMinToTimeArray($record->drop_time);
                $dt = Carbon::now($this->userTimezone);
                $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                $record['drop_time'] = $dt->format('g:i A');
            }

            if((string)$record->pick_time != null){
                $time = DateTimeHelper::formatMinToTimeArray($record->pick_time);
                $dt = Carbon::now($this->userTimezone);
                $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                $record['pick_time'] = $dt->format('g:i A');
            }

            if((string)$record->parent_pick_time != null){
                $time = DateTimeHelper::formatMinToTimeArray($record->parent_pick_time);
                $dt = Carbon::now($this->userTimezone);
                $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                $record['parent_pick_time'] = $dt->format('g:i A');
            }

            if((string)$record->parent_drop_time != null){
                $time = DateTimeHelper::formatMinToTimeArray($record->parent_drop_time);
                $dt = Carbon::now($this->userTimezone);
                $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);
                $record['parent_drop_time'] = $dt->format('g:i A');
            }

            if($record['pick_child_note_id']) {
                $child_note = app("Kinderm8\\{$childnote_model}")->select('id', 'note')->find($record['pick_child_note_id']);
                $record['pick_child_remark'] = $child_note['note'];
            }

            if($record['drop_child_note_id']) {
                $child_note = app("Kinderm8\\{$childnote_model}")->select('id', 'note')->find($record['drop_child_note_id']);
                $record['drop_child_remark'] = $child_note['note'];
            }
        }

        return $attendance;
    }

    /**
     * @param Request $request
     * @param Collection
     * @param string $room_model
     * @param string $staff_attendance_model
     * @return Builder[]|Collection
     */
    public function roomAttendance(Request $request, string $room_model, string $staff_attendance_model){

        $organization_id = auth()->user()->organization_id;
        $today = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));
        if(is_null(auth()->user()->branch_id)){
            $branch_id = ($request->input('branch_id') != null)? Helpers::decodeHashedID($request->input('branch_id')): null;
        }else{
            $branch_id = auth()->user()->branch_id;
        }

        $rooms =  app("Kinderm8\\{$room_model}")
            ->where('status', '=', '0')
            ->where('admin_only', false)
            ->with(['child'])
            ->where('organization_id', '=', $organization_id);

        if($branch_id != null){
            $rooms = $rooms->where('branch_id', '=', $branch_id);
        }
        $rooms = $rooms->whereNull('deleted_at')
            ->orderBy('title', 'ASC')
            ->get();

        foreach($rooms as $room)
        {
            $child_ids = array();
            foreach ($room['child'] as $child){
                if($child['status'] == '1' && $child['deleted_at'] == NULL){
                    array_push($child_ids, $child['id']);
                }
            }

            $room_attendance = $this->attendance
                ->with(['booking'])
                ->whereIn('child_id', $child_ids)
                ->whereNull('pick_time')
                ->where('type', '=','0')
                ->where('date', '=', $today)
                ->get();

            $room_attendance = $room_attendance->where('booking.deleted_at', '=', null)
                ->where('booking.room_id', '=', $room->id)
                ->where('date', '=', $today)
                ->groupBy('child_id');

            $room['attendance_count'] = $room_attendance->count();

            $staff_attendance =  app("Kinderm8\\{$staff_attendance_model}")
                ->whereDate('checkin_datetime', '=', $today)
                ->where('checkin_type', '=', 'room')
                ->where('checkin_to_id', '=', $room->id)
                ->whereNull('checkout_datetime')
                ->where('organization_id', '=', $organization_id)->with('staff');

                if($branch_id != null){
                    $staff_attendance = $staff_attendance->where('branch_id', '=', $branch_id);
                }
            $staff_attendance = $staff_attendance->whereNull('deleted_at');

            $staff_names = $staff_attendance->distinct('staff_id')->get()->pluck('staff');

            $room['staff_attendance']  = $staff_attendance->get()->groupBy('staff_id')->count();
            $room['staff_names']  = $staff_names;
        }

        return $rooms;
    }

    /**
     * @param Request $request
     * @param string $child_model
     * @return mixed
     * @throws BindingResolutionException
     */
    public function getInActiveChild(Request $request, string $child_model){

        return app()->make("Kinderm8\\{$child_model}")::where('status', '=', '0')
                    ->where('branch_id',auth()->user()->branch_id)
                    ->pluck('id')
                    ->toArray();
    }

    /**
     * @param $id
     * @param array $depends
     * @param bool $throwable
     * @return Builder|Model|object|null
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends, bool $throwable)
    {
        $obj = $this->attendance->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $obj->with($depends);
        }

        $obj = $obj->first();

        if (is_null($obj) && $throwable)
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $obj;
    }

    /**
     * @param $id
     * @param array $depends
     * @param bool $throwable
     * @return Builder|Model|object|null
     * @throws ResourceNotFoundException
     */
    public function findBookingById($id, array $depends, bool $throwable)
    {
        $obj = $this->attendance->where('booking_id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $obj->with($depends);
        }

        $obj = $obj->first();

        if (is_null($obj) && $throwable)
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $obj;
    }

    /**
     * @param $id
     * @return Builder|Model|object|null
     * @throws ResourceNotFoundException
     */
    public function delete($id)
    {
        $rowObj = $this->findBookingById($id, [], false);

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
     * @param $time
     * @return float|int
     */
    private function timeToMinute($time)
    {
        // \Log::info($time);

        $splitArr = explode(':', $time);

        $splitArr[0] = (int) $splitArr[0] * 60;
        $splitArr[1] = (int) $splitArr[1];
        $mins = array_sum($splitArr);

        return $mins;
    }
}
