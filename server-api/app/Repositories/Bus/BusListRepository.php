<?php

namespace Kinderm8\Repositories\Bus;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Kinderm8\Bus;
use Kinderm8\Child;
use Kinderm8\ChildSchoolBus;
use Kinderm8\Booking;
use Kinderm8\ChildAttendance;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;

class BusListRepository implements IBusListRepository
{
    use UserAccessibility;

    private $bus;
    private $child;
    private $booking;
    private $attendance;
    private $userTimezone;

    public function __construct(Bus $bus, Child $child, Booking $booking, ChildAttendance $attendance)
    {
        $this->bus = $bus;
        $this->child = $child;
        $this->booking = $booking;
        $this->attendance = $attendance;
        $this->userTimezone = (auth()->check())? auth()->user()->timezone : null;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->bus, $method], $args);
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function get($args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //query builder
            $bus_list = $this->bus
                ->with(['school'])->whereNull('deleted_at');;

            //access
            $busList = $this->attachAccessibilityQuery($bus_list , null, 'km8_bus_list');

            // if school ID is set, get all busses assigned for that school only
            if (isset($args) && !is_null($args) && array_key_exists('schoolID', $args))
            {
                $schoolID = $args['schoolID'];
                $busList->whereHas('school', function ($query) use ($schoolID)
                {
                    $query->where('school_id', $schoolID);
                });
            }

            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //get actual count
            $actualCount = $busList->get()->count();


            //search
            if(!is_null($searchValue))
            {
                $busList->whereLike([
                    'km8_bus_list.bus_name',
                ], $searchValue);
            }
            if(Helpers::IsNullOrEmpty($request->input('offset')))
                $busList = $busList->orderBy('bus_name','asc')->get();
            else
                $busList = $busList->orderBy('bus_name','asc')->paginate($offset);;

            $displayCount = $busList->count();
            /*$busList = $busList
                ->orderBy('km8_educator_ratio.state', 'DESC')
                ->orderBy('km8_educator_ratio.age_order', 'ASC')
                ->select(['km8_educator_ratio.*'])->get();*/

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $busList = [];
        }

        return [
            'list' => $busList,
            'totalRecords' => $actualCount,
            'filters' => $filters,
            'displayRecord' => $displayCount,
        ];
    }

    public function getChildrenBySchool($args, Request $request){

        // if school ID is set, get all children assigned for that school only

        try
        {
            if (isset($args) && !is_null($args) && array_key_exists('schoolID', $args))
            {
                $child_list = $this->child
                    ->with(['school_bus'])
                    ->where('km8_child_profile.status','1')
                    ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');

                $child_list = $this->attachAccessibilityQuery($child_list, null, 'km8_child_profile');


                $schoolID = $args['schoolID'];

                $child_list->whereHas('school_bus', function ($query) use ($schoolID) {
                    $query->where('school_id', $schoolID);
                });
                $child_list->orderBy('last_name', 'asc');

            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $child_list = [];
        }
        return $child_list->select(['km8_child_profile.*', ])->get();

    }

    /**
     * @param $args
     * @param $request
     * @return mixed
     */
    public function getChildrenAndSchoolsByBus($args, Request $request){

        $child_list = [];
        try
        {
            if (isset($args) && !is_null($args) && array_key_exists('busID', $args))
            {
                $busID = $args['busID'];
                $room = (array_key_exists('room', $args))? $args['room']: null;

                $child_list = $this->child
                    ->with(['school_bus'])
                    ->where('km8_child_profile.status','1')
                    ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');

                $child_list = $this->attachAccessibilityQuery($child_list, null, 'km8_child_profile');

                $child_list->whereHas('school_bus', function ($query) use ($busID) {
                    $query->where('bus_id', $busID);
                });

                if($room != null){
                    $child_list->whereHas('school_bus', function ($query) use ($room) {
                        $query->where('room_id', $room);
                    });
                }
                $child_list = $child_list->orderBy('first_name', 'asc');
                $child_list = $child_list->select(['km8_child_profile.*', ])->get();
            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }
        return $child_list;
    }


    /**
     * @param $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id)
    {
        $bus = $this->bus->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends)) {
            $bus->with($depends);
        }

        $bus = $bus->first();

        if (is_null($bus)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $bus;
    }


    /**
     * @param Request $request
     * @return Bus
     */
    public function store(Request $request)
    {
        $busList = new $this->bus;

        $busList->organization_id = auth()->user()->organization_id;
        $busList->branch_id = auth()->user()->branch_id;
        $busList->bus_name =  $request->input('bus_name');


        $busList->save();

        return $busList;
    }


    /**
     * @param $id
     * @param Request $request
     * @return Bus
     * @throws ResourceNotFoundException
     */
    public function update($id, Request $request)
    {
        $bus = $this->findById($id);

        $bus->bus_name = $request->input('bus_name');

        $bus->save();

        return $bus;
    }


    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $busList = $this->findById($id);

        if ($busList->deleted_at != null) {
            $busList->forceDelete();
        } else {
            $busList->delete();

        }

        return true;
    }


    public function addChildrenToBus(string $busID,string $schoolID, $children)
    {
        try {
            /*$bus = $this->findById($busID);
            $school = School::find($schoolID);*/
            DB::table('km8_child_school_bus')
                ->where('bus_id', Helpers::decodeHashedID($busID))->where('school_id', Helpers::decodeHashedID($schoolID))
                ->update(array('deleted_at' => DB::raw('NOW()')));

            foreach($children as $child_id)
            {
                DB::table('km8_child_school_bus')
                    ->where('child_id', Helpers::decodeHashedID($child_id))
                    ->update(array('deleted_at' => DB::raw('NOW()')));

                $childSchoolBus = new ChildSchoolBus();
                $childSchoolBus->child_id = Helpers::decodeHashedID($child_id);
                $childSchoolBus->bus_id = Helpers::decodeHashedID($busID);
                $childSchoolBus->school_id = Helpers::decodeHashedID($schoolID);
                $childSchoolBus->save();
            }
        }
        catch (Exception $e) {
            \Log::info($e);
        }

    }

    /**
     * @param Request $request
     * @param string $childnote_model
     * @return Builder[]|Collection
     */
    public function getBusAttendance(Request $request, string $childnote_model){

        $user_id = auth()->user()->id;
        $bus_id = $request->input('bus_id');
        $child_id = (!Helpers::IsNullOrEmpty($request->input('child_id'))) ? Helpers::decodeHashedID($request->input('child_id')) : null;
        $today = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));

        $attendance = $this->attendance->with(['picker','dropper'])
            ->where('branch_id', '=', auth()->user()->branch_id)
            ->where('bus_id', '=', Helpers::decodeHashedID($bus_id))
            ->whereDate('date', '=', $today);

        if($child_id != null){
            $attendance = $attendance->where('child_id', '=', $child_id);
        }

        $attendance = $attendance->whereNull('deleted_at')
            ->get();

        return $attendance;
    }

    /**
     * @param Request $request
     * @param string $school_model
     * @param string $childnote_model
     * @param string $childToSchool_model
     * @param string $booking_model
     * @return array
     * @throws Exception
     */
    public function createAttendance(Request $request, string $school_model, string $childnote_model, string $childToSchool_model, string $booking_model)
    {
        $organization_id = auth()->user()->organization_id;
        $branch_id = auth()->user()->branch_id;
        $user = auth()->user()->id;

        $bus_id = $request->input('bus_id');
        $child_ids = json_decode($request->input('child_ids'));
        $school_ids = json_decode($request->input('school_ids'));
        $booking_ids = json_decode($request->input('booking_ids'));
        $ids = json_decode($request->input('attendance_ids'));
        $type = $request->input('type');   // 0 - attendance. 1 - absence
        $absence_reason = $request->input('absence_reason');

        $drop_geocoordinates = $request->input('drop_geo_coordinates');
        $drop_signature = $request->input('drop_signature');
        $pick_geocoordinates = $request->input('pick_geo_coordinates');
        $pick_signature = $request->input('pick_signature');

        $remark = $request->input('remark');
        $current_time = Carbon::now($this->userTimezone);
        $device_time =  $this->timeToMinute($request->input('time'));
        $date = strtolower($current_time->format('Y-m-d'));

        $success_records = array();
        $i = 0;

        foreach($child_ids as $child_id) {

            $child = $this->child->find(Helpers::decodeHashedID($child_id));

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

                    $bus = $this->bus->where('id', '=', Helpers::decodeHashedID($bus_id))->count();
                    if($bus == 0){
                        return array(
                            'status' => 'bus not found '. $bus_id,
                            'attendance_ids' => $success_records
                        );
                    }

                    $school = app("Kinderm8\\{$school_model}")->where('id', '=', Helpers::decodeHashedID($school_ids[$i]))->count();
                    if($school == 0){
                        return array(
                            'status' => 'school not found '. $school_ids[$i],
                            'attendance_ids' => $success_records
                        );
                    }

                    $childtoschool = app("Kinderm8\\{$childToSchool_model}")
                        ->where('child_id', '=', Helpers::decodeHashedID($child_id))
                        ->where('bus_id', '=', Helpers::decodeHashedID($bus_id))
                        ->where('school_id', '=', Helpers::decodeHashedID($school_ids[$i]))
                        ->count();

                    if($childtoschool == 0){
                        return array(
                            'status' => 'Child has not added to school bus ',
                            'attendance_ids' => $success_records
                        );
                    }

                    if($type == 1){
                        $status = 2;
                    }else{
                        $status = 1;
                        $absence_reason = 'NONE';
                    }

                    app("Kinderm8\\{$booking_model}")->where('id', $booking_id)
                            ->where('child_id', Helpers::decodeHashedID($child_id))
                            ->where('organization_id', $organization_id)
                            ->where('branch_id', $branch_id)
                            ->update([
                                'status' => $status,
                                'absence_reason' => $absence_reason
                            ]);

                    $child_note_id = null;
                    if ($remark != null && $remark != "") {
                        $child_note = app("Kinderm8\\{$childnote_model}");
                        $child_note->child_id = Helpers::decodeHashedID($child_id);
                        $child_note->user_id = $user;
                        $child_note->note = $remark;
                        $child_note->created_at = $current_time;
                        $child_note->updated_at = $current_time;
                        $child_note->save();

                        $child_note_id = $child_note->id;
                    }

                    $attendance = new $this->attendance;
                    $attendance->organization_id = $organization_id;
                    $attendance->branch_id = $branch_id;
                    $attendance->child_id = Helpers::decodeHashedID($child_id);
                    $attendance->booking_id = $booking_id;
                    $attendance->date = $date;
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
                    $attendance->is_extra_day = 0;
                    $attendance->ccs_submitted = false;
                    $attendance->type = $type;
                    $attendance->bus_id = Helpers::decodeHashedID($bus_id);
                    $attendance->school_id = Helpers::decodeHashedID($school_ids[$i]);
                    $attendance->deleted_at = null;
                    $attendance->created_at = $current_time;
                    $attendance->updated_at = $current_time;
                    $attendance->save();

                    array_push($success_records, $attendance->id);
                    $status = 200;

                } else {
                    // pick
                    $attendance_id = $ids[$i];
                    // check for non pick records
                    $attendance = $this->attendance->where('id', Helpers::decodeHashedID($attendance_id))
                        ->whereNull('pick_time')
                        ->first();

                    if ($attendance) {
                        // not picked
                        $child_note_id = null;
                        if ($remark != null && $remark != "") {

                            $child_note = app("Kinderm8\\{$childnote_model}");
                            $child_note->child_id = Helpers::decodeHashedID($child_id);
                            $child_note->user_id = $user;
                            $child_note->note = $remark;
                            $child_note->created_at = $current_time;
                            $child_note->updated_at = $current_time;
                            $child_note->save();

                            $child_note_id = $child_note->id;
                        }

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
     * @param $time
     * @return float|int
     */
    private function timeToMinute($time)
    {
        $splitArr = explode(':', $time);

        $splitArr[0] = (int) $splitArr[0] * 60;
        $splitArr[1] = (int) $splitArr[1];
        $mins = array_sum($splitArr);

        return $mins;
    }


    /**
     * @param Request $request
     * @param string|null $booking_model
     * @return array
     * @throws BindingResolutionException
     */
    public function getBusAttendanceForReport(Request $request, ?string $bus_attendance_model)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('sdate'))) ? $request->input('sdate') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('edate'))) ? $request->input('edate') : null;

        $attendances = app("Kinderm8\\{$bus_attendance_model}")
            ->with(['child', 'bus', 'school', 'dropper', 'picker', 'dropnote', 'picknote']);

        $attendances = $this->attachAccessibilityQuery($attendances);


        $attendances =  $attendances
            ->whereBetween('date', [$start,$end])
            ->orderBy('date', 'ASC')
            ->get();


        return [
            'list' => $attendances,
            'actual_count' => $attendances->count(),
        ];
    }


    /**
     * @param Request $request
     * @param string|null $booking_model
     * @return array
     * @throws BindingResolutionException
     */
    public function getBusListReport(Request $request, ?string $child_booking_model)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('sdate'))) ? $request->input('sdate') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('edate'))) ? $request->input('edate') : null;
        $room = Helpers::decodeHashedID($request->input('room'));
        $bus = Helpers::decodeHashedID($request->input('bus'));
        $attendances = app("Kinderm8\\{$child_booking_model}")
            ->with(['child', 'child.school_bus']);

        $attendances = $this->attachAccessibilityQuery($attendances, null, 'km8_child_bookings');


        if($end)
        {
            \Log::info('Weekly');
            $attendances =  $attendances
                ->whereBetween('date', [$start,$end])
                ->where('km8_child_bookings.room_id', $room)
                ->join('km8_fees','km8_fees.id', '=', 'km8_child_bookings.fee_id')
                ->join('km8_child_profile','km8_child_profile.id', '=', 'km8_child_bookings.child_id')
                ->leftJoin('km8_child_to_user', 'km8_child_profile.id', '=', 'km8_child_to_user.child_id')
                ->leftJoin('km8_users', 'km8_users.id', '=', 'km8_child_to_user.user_id')
                ->join('km8_child_school_bus', 'km8_child_profile.id', '=', 'km8_child_school_bus.child_id')
                ->join('km8_school_list','km8_child_school_bus.school_id','=','km8_school_list.id')
                ->join('km8_bus_list', 'km8_child_school_bus.bus_id','=','km8_bus_list.id')
                ->where('km8_child_school_bus.bus_id', $bus)
                ->whereNull('km8_child_school_bus.deleted_at')
                ->whereNull('km8_child_profile.deleted_at')
                ->where('km8_child_profile.status', '1')
                ->orderBy('date', 'ASC')
                ->get();
        }
        else
        {
            \Log::info('Daily');
            $attendances =  $attendances
                ->where('date', $start)
                ->where('km8_child_bookings.room_id', $room)
                ->join('km8_fees','km8_fees.id', '=', 'km8_child_bookings.fee_id')
                ->join('km8_child_profile','km8_child_profile.id', '=', 'km8_child_bookings.child_id')
                ->leftJoin('km8_child_to_user', 'km8_child_profile.id', '=', 'km8_child_to_user.child_id')
                ->leftJoin('km8_users', 'km8_users.id', '=', 'km8_child_to_user.user_id')
                ->join('km8_child_school_bus', 'km8_child_profile.id', '=', 'km8_child_school_bus.child_id')
                ->join('km8_school_list','km8_child_school_bus.school_id','=','km8_school_list.id')
                ->join('km8_bus_list', 'km8_child_school_bus.bus_id','=','km8_bus_list.id')
                ->where('km8_child_school_bus.bus_id', $bus)
                ->whereNull('km8_child_school_bus.deleted_at')
                ->whereNull('km8_child_profile.deleted_at')
                ->where('km8_child_profile.status', '1')
                ->orderBy('date', 'ASC')
                ->get();
        }

        return [
            'list' => $attendances,
            'actual_count' => $attendances->count(),
        ];
    }

}
