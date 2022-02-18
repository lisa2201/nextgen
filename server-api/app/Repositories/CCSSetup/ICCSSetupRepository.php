<?php

namespace Kinderm8\Repositories\CCSSetup;

use Illuminate\Http\Request;

interface ICCSSetupRepository
{

    public function findById(int $id, array $depends);

    public function list(Request $request);

    public function get(array $args, array $depends, Request $request, bool $withTrashed);
    
    public function findByProvider(int $provider_id, array $depends);

    public function findByService(int $service_id, array $depends);

    public function findByBranch(int $branch_id, array $depends);

    public function findByUser(int $user_id, array $depends);

}
