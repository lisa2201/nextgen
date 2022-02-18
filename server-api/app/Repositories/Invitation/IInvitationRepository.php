<?php

namespace Kinderm8\Repositories\Invitation;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

interface IInvitationRepository
{
    public function accept(Request $request, ?Model $invitation, Collection $branches, string $user_model, string $role_model);

    public function resend(string $id, Request $request);

    public function findById($id);

    public function findByEmail(Request $request, string $user_model);

    public function findByToken(string $token);

    public function list($args, Request $request);

    public function store(Request $request);

    public function update(string $id, Request $request);

    public function delete(string $id);

    public function manualDelete($id);
}
