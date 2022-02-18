<?php

namespace Kinderm8\Repositories\Child;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IChildRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list(array $args, Request $request);

    public function store(Request $request);

    public function findById($id, array $depends);

    public function findChildrenByParent(Request $request, array $args, ?Model $user, bool $withTrashed);

    public function update(string $id, Request $request, string $cultural_model);

    public function delete(string $id);

    public function updateUsers(string $id, Request $request, string $type);

    public function updateEmergencyContact(string $id, Request $request, string $type, string $user_model, string $emergency_contact_model);

    public function updateRooms(string $id, Request $request, string $type);

    public function setCRN(string $id, string $value);

    public function getAttendance(Request $request, string $childAttendance_model);

    public function setPrimaryPayer(int $id, int $user_id);

    public function setEmergencyContact(int $id, int $user_id, Request $request);

    public function detachEmergencyContact(int $id, int $user_id);

    public function getChildIdInRoom(Request $request);

    public function updateParentLogin(string $id, Request $request, string $cultural_model);

    public function updateTrackingValue(string $id);

    public function findByBranch($id,  array $args, array $depends);
}
