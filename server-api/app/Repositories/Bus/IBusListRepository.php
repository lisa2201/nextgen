<?php

namespace Kinderm8\Repositories\Bus;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IBusListRepository
{
    public function get($args, Request $request);

    public function getChildrenBySchool($args, Request $request);

    public function getChildrenAndSchoolsByBus($args, Request $request);

    public function store(Request $request);

    public function update($id, Request $request);

    public function delete(string $id);

    public function addChildrenToBus(string $busID, string $schoolID, $children);

    public function getBusListReport(Request $request, string $child_booking_model);

    public function getBusAttendance(Request $request, string $childnote_model);

    public function getBusAttendanceForReport(Request $request, string $bus_attendance_model);

    public function createAttendance(Request $request, string $school_model, string $childnote_model, string $childToSchool_model, string $booking_model);

 //   public function list($args, Request $request);

}
