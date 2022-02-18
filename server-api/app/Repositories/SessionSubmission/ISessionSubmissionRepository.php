<?php

namespace Kinderm8\Repositories\SessionSubmission;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface ISessionSubmissionRepository
{
    public function get(Request $request, $child_ref, array $args, array $depend);

    public function list($args, Request $request);

    public function store(Request $request, ?Model $enrolment, ?Model $user, string $attendance_model);

    public function bulkStore(Request $request, ?Model $user, string $attendance_model);

    public function findById($id, array $depends);

    public function findByEnrolmentId($enrolment_reference, array $depends);

    public function update(string $id, Request $request, ?Model $authUser, string $attendance_model);

    public function delete(string $id, string $attendance_model);

    public function withdraw(string $id, Request $request, string $attendance_model);

    public function bulkUpdateStatus(array $list);

    public function recreate(Request $request, ?Model $authUser, string $attendance_model);
}
