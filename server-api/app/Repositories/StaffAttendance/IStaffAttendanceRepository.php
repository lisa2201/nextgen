<?php

namespace Kinderm8\Repositories\StaffAttendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface IStaffAttendanceRepository
{
    public function getStaffAttendance(Request $request);

    public function create(Request $request);

    public function delete($id);
}
