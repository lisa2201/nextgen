<?php

namespace Kinderm8\Repositories\Reimbursements;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IReimbursementsRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $throwable);

    public function list($args, Request $request);

    public function store(Request $request);

    public function findById($id, array $depends);

    public function update(Request $request);

    public function delete(string $id);


}
