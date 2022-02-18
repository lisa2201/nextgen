<?php

namespace Kinderm8\Repositories\ParentFinanceExclusion;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IParentFinanceExclusionRepository
{

    public function findById(int $id);

    public function list(Request $request, array $args);

    public function store(Request $request);

    public function delete(int $id);

}
