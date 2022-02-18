<?php

namespace Kinderm8\Repositories\ParentPaymentSchedule;

use Illuminate\Http\Request;

interface IParentPaymentScheduleRepository
{

    public function findById(int $id);

    public function list(Request $request, array $args);

    public function store(Request $request);

    public function update(Request $request);

    public function delete(int $id);

}