<?php

namespace Kinderm8\Repositories\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface IAttendanceRepository
{
    public function weekList($args, Request $request, string $booking_model);

    public function getBookingAttendance(Request $request, $child_ref, string $booking_model, array $args, array $depends, bool $throwable);

    public function getBookingAttendanceForReport(Request $request, ?string $booking_model);

    public function getById($ids, string $childnote_model);

    public function findByChildren(Request $request, ?Collection $children, array $depends, bool $withTrashed);

    public function getByDay(Request $request, $child_id, string $childnote_model);

    public function createAttendance(Request $request, string $child_model, string $childnote_model, string $booking_model);

    public function updateBulkAttendance(Request $request, string $booking_model);

    public function getMissedAttendance(Request $request, string $child_model, string $childnote_model);

    public function updateMissedAttendance(Request $request, string $child_model, string $childnote_model);

    public function formatAttendanceObject($attendance, string $childnote_model);

    public function roomAttendance(Request $request, string $room_model, string $staff_attendance_model);

    public function findById($id, array $depends, bool $throwable);

    public function findBookingById($id, array $depends, bool $throwable);

    public function delete($id);
}
