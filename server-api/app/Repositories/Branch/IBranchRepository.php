<?php

namespace Kinderm8\Repositories\Branch;

use Illuminate\Http\Request;
use Kinderm8\Branch;

interface IBranchRepository
{
    public function getModelName();

    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list($args, $withTrashed);

    public function store(Request $request);

    public function findById($id);

    public function findByIds($id, array $depends, bool $withTrashed, bool $throwable);

    public function findByDomain(string $domain, ?string $ignore, bool $withTrashed, array $depends);

    public function findByOrg(string $id, array $args, bool $withTrashed);

    public function update(string $id, Request $request);

    public function updateStatus(string $id, Request $request);

    public function delete(string $id);

    public function getClientId(string $pincode);

    public function getClientIdByDomain(string $domain);

}
