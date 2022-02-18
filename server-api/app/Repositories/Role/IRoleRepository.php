<?php

namespace Kinderm8\Repositories\Role;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IRoleRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list($args);

    public function store(Request $request);

    public function findById($id);

    public function findByType(string $type, array $args, array $depends);

    public function findByName(string $name, array $depends);

    public function update(string $id, Request $request);

    public function delete(string $id);

    public function attachRolesToUser(array $role_ids, Model $user);

    public function listRoleMigration($args);
}
