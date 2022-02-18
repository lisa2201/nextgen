<?php

namespace Kinderm8\Repositories\StaffIncident;

use Illuminate\Http\Request;

interface IStaffIncidentRepository
{
    public function getIncident(Request $request);

    public function list(Request $request);

    public function store(Request $request);

    public function update(string $id, Request $request);

    public function delete(string $id);

}
