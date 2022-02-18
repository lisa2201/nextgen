<?php

namespace Kinderm8\Repositories\Permission;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

interface IPermissionRepository
{
    public function list(array $args, bool $withTrashed);

    public function findByRole($role, array $columns);

    public function getByRole();

    public function attachPermissionsToRole(array $perms_ids, Model $role);
}
