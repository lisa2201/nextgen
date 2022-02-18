<?php

namespace Kinderm8\Repositories\Room;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IRoomRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list(Request $request);

    public function delete(string $id);

    public function update(Request $request);

    public function findById($id, array $depends);

    public function updateStatus(Request $request, string $id);

    public function store(Request $request, string $capacity_model);

    public function findRoomsForChild(Request $request, ?Model $child, bool $withTrashed);

    public function findRoomsForUser(Request $request, ?Model $user, bool $withTrashed);

    public function findRoomsForBranch(Request $request, int $branch_id, bool $withTrashed);
}
