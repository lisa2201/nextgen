<?php

namespace Kinderm8\Repositories\Booking;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

interface IBookingRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list(array $args, Request $request);

    public function bulkStore(Request $request, string $child_room_sync_model, string $fee_adjusted_model);

    public function store(Request $request, ?Model $fee, ?Model $fee_adjusted, ?Model $child, $room_id, string $attendance_model);

    public function findById($id, array $depends);

    public function findByBranch($id, array $args, array $depends, bool $withTrashed, Request $request, bool $distinct = false);

    public function findByRoom($reference, array $args, array $depends, bool $withTrashed, Request $request);

    public function findByFeeId($id, array $args, array $depends, bool $withTrashed, Request $request, bool $throwable);

    public function bulkUpdate(Request $request, string $action, string $fee_model, string $fee_adjusted_model, string $attendance_model);

    public function update(string $id, ?Model $fee, ?Model $fee_adjusted, Request $request, string $attendance_model);

    public function delete(string $id);

    public function updateType(string $id, Request $request, string $attendance_model);

    public function getPreviewSlots(?Model $child, Request $request);

    public function getBookingsPreviewSlots(?Model $child, Request $request, string $room_model, string $fee_model);

    public function kioskBookings(Request $request);

    public function getBulkBookingAttendancePreview($reference, Request $request);

    public function migrate(Request $request, Model $branch, Model $user);

    public function updateChildRoomSync(?Collection $children, array $rooms, array $slots, $update_room, string $child_room_sync_model);

    public function deleteChildRoomSync(array $children, array $rooms, string $child_room_sync_model);

    public function isOverlapped(array $getBookings, $feeObject);

    public function updateFees(Model $feeAdjusted);

    public function getDashboardSummary(Request $request, string $room_model, $day_index, string $branch_model);

    /*---------------------------------------------------------------*/

    public function masterRollList(array $args, Request $request);

    public function masterRollBulkUpdate(Request $request, ?Collection $child_list, string $action, string $fee_model, string $fee_adjusted_model, string $attendance_model);

    public function masterRollGetBookingsPreviewSlots(?Collection $child_list, Request $request, string $room_id);

    public function masterRollGetManageBookingsPreviewSlots(?Collection $child_list, Request $request, string $room_model, string $fee_model);

    public function ReportRollList(array $args, Request $request);

    public function masterRollOccupancy(array $args, Request $request);
}
