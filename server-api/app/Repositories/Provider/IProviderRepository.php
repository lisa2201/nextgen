<?php

namespace Kinderm8\Repositories\Provider;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IProviderRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function findByOrgId(string $orgId);

    public function findById(int $id, array $depends);

    public function findByService(int $service_id, array $depends);

    public function findByBranch(int $branch_id, array $depends);

    public function findByUser(int $user_id, array $depends);
}
