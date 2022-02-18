<?php

namespace Kinderm8\Repositories\User;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IUserRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $throwable);

    public function list($args, Request $request);

    public function store(Request $request, string $role_model);

    public function findById($id, array $depends);

    public function findByBranch($id, array $args, array $depends);

    public function findByEmail(Request $request, string $email);

    public function findBranchUserBySubscriber($org_id, $user_id, string $email, array $args, array $depends, bool $withTrashed, bool $throwable);

    public function findByMobile($phone);

    public function findSubscriber($id, array $depends);

    public function update(string $id, Request $request);

    public function updateStatus(string $id, Request $request);

    public function delete(string $id);

    public function setCRN(string $id, string $value);

    public function findParentByChild(Request $request, ?Model $child, bool $withTrashed);

    public function findUserForEmergencyContacts(Request $request, ?Model $child, bool $withTrashed);

    public function findAdministrativeUsers(Request $request, bool $onlyAdministrator, bool $withTrashed);

    public function findParentUsers(array $args, Request $request, bool $withTrashed);

    public function getAllParents();

    public function updatePassword(string $id, string $password);

    public function resetPassword(string $id, Request $request);

    public function findByIdForPasswordSetup($id);

    public function getAllActiveParents(Request $request);

    public function updateRooms(string $id, Request $request, string $type);

    public function findByBranchStaffAndParent($id, array $args, array $depends);

    public function generatePin(string $id, Request $request);

    public function findAdministrativeUsersForBranchWithEmailSettings(string $org_id, string $branch_id, string $crmType, bool $emailTypeCheck, bool $onlyAdministrator, bool $withTrashed);

    public function getStaffList(string $user);
}
