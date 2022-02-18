<?php

namespace Kinderm8\Repositories\VisitorDetails;

use Illuminate\Http\Request;

interface IVisitorDetailsRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function getStaffList(string $user_model);

    public function store(Request $request);

    public function signoutVisitor(string $id);

    public function update(string $id, Request $request);

    public function delete(string $id);
    
}
