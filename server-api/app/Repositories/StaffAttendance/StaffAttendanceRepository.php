<?php

namespace Kinderm8\Repositories\StaffAttendance;

use Carbon\Carbon;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\StaffAttendance;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use DateTimeHelper;
use DateTime;
use Log;

class StaffAttendanceRepository implements IStaffAttendanceRepository
{
    use UserAccessibility;

    private $attendance;

    public function __construct(StaffAttendance $attendance)
    {
        $this->attendance = $attendance;
    }

    /**
     * @param Request $request
     * @param bool $throwable
     * @return Builder[]|Collection
     * @throws Exception
     */
    public function getStaffAttendance(Request $request)
    {
        $checkin_type = (! Helpers::IsNullOrEmpty($request->input('checkin_type'))) ? $request->input('checkin_type') : null;
        $staff = (! Helpers::IsNullOrEmpty($request->input('staff_id'))) ? Helpers::decodeHashedID($request->input('staff_id')) : null;
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : strtolower(Carbon::now(auth()->user()->timezone)->addDays(1)->format('Y-m-d'));

        $attendances = $this->attendance
            ->with(['staff']);

        if($checkin_type != null){
            $attendances = $attendances->where('checkin_type', $checkin_type);
        }

        if($staff != null){
            $attendances = $attendances->where('staff_id', $staff);
        }

        $attendances = $attendances
            ->whereBetween('checkin_datetime', [$start, $end])
            ->orderBy('checkin_datetime', 'DESC')
            ->get();

        return $attendances;
    }

    /**
     * @param Request $request
     * @return array
     * @throws Exception
     */
    public function create(Request $request)
    {

        $type = $request->input('type');
        $chekin_to = (! Helpers::IsNullOrEmpty($request->input('checkin_to_id')))? Helpers::decodeHashedID($request->input('checkin_to_id')): 0;

        if($type == 'create'){
            $attendance = new $this->attendance;
            $attendance->organization_id = auth()->user()->organization_id;
            $attendance->branch_id = auth()->user()->branch_id;
            $attendance->staff_id = Helpers::decodeHashedID($request->input('staff_id'));
            $attendance->checkin_type = $request->input('checkin_type');
            $attendance->checkin_datetime = $request->input('checkin_datetime');
            $attendance->checkout_datetime = $request->input('checkout_datetime');
            $attendance->checkin_to_id = $chekin_to;
            $attendance->created_user_id = auth()->user()->id;
            $attendance->checkin_signature = $request->input('signature');
            $attendance->save();

        }else if($type == 'update'){
            $attendance = $this->attendance->find(Helpers::decodeHashedID($request->input('id')));

            if($attendance){
                $attendance->checkout_datetime = $request->input('checkout_datetime');
                $attendance->save();
            }
        }

        return $attendance;
    }

    /**
     * @param $id
     * @return Boolean
     * @throws ResourceNotFoundException
     */
    public function delete($id)
    {
        $rowObj = $this->attendance
            ->where('id', '=', Helpers::decodeHashedID($id))
            ->get()
            ->first();

        if($rowObj != null){
            $rowObj->delete();
            return true;

        }else{
            return false;
        }
    }

}
