<?php

namespace Kinderm8\Repositories\Contactreport;

use Illuminate\Http\Request;

interface IContactReportRepository
{
    public function getContactParentAndChildReport(Request $request, string $child_model);

    public function ChildEmergencyContactsReport(Request $request, string $child_model, string $child_emergency_model, string $withParents = null);

    public function educatorDetailsReport(Request $request, string $user_model, string $child_model, string $room_model);

    public function viewPrimaryPayerReport(Request $request, string $child_model);
    // public function findById($id, array $depends);

    // public function update(string $id, Request $request, string $cultural_model);

    // public function delete(string $id);

    // public function updateUsers(string $id, Request $request, string $type);

    // public function updateRooms(string $id, Request $request, string $type);

    // public function setCRN(string $id, string $value);
}
