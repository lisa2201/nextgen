<?php

namespace Kinderm8\Repositories\Service;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IServiceRepository
{

    public function findById(int $id, array $depends);

    public function findByBranch(int $branch_id, array $depends);

    public function findByUser(int $user_id, array $depends);

    public function store(array $apiData, string $ProviderId);

    public function read(Request $request, string $person_id, string $ccs_setup_id);
}
