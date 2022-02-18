<?php

namespace Kinderm8\Repositories\Organization;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IOrganizationRepository
{
    public function list(array $args, array $depends, Request $request);

    public function findById($id, array $depends, bool $withTrashed);

    public function linkBranches(Model $org_user, Model $admin_role, string $user_model, Request $request);
}
