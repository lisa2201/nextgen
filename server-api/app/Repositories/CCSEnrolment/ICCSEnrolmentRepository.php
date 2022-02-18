<?php

namespace Kinderm8\Repositories\CCSEnrolment;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface ICCSEnrolmentRepository
{
    public function get(array $args, Request $request, array $depend, bool $withTrashed);

    public function store(Request $request, ?Model $user);

    public function findById($id, array $depends);

    public function findByEnrolmentId($enrol_id, bool $withTrashed);

    public function findByStatus(string $status, bool $withTrashed, bool $throwable);

    public function update(string $id, Request $request);

    public function delete(string $id);

    public function submit(string $id, string $type, Request $request);

    public function migrate(Request $request, Model $branch, Model $user);

    public function updateParentStatus(string $id);

    public function close(string $id, Request $request);

    public function CCSEnrolmentReport(Request $request, array $child_id);
}
