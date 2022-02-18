<?php

namespace Kinderm8\Repositories\Immunisation;

use Illuminate\Http\Request;

interface IImmunisationRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function list(array $args, Request $request);

    public function store(Request $request, string $schedule_model, string $branchModel);

    public function updateStatus(string $id, Request $request);

    public function update(string $id, Request $request, string $schedule_model);

    public function delete(string $id);

    public function getTracker(array $args, Request $request, string $tracker_model);

    public function getAllTracker(array $args, Request $request, string $tracker_model);

    public function storeSingleTracker(Request $request, string $tracker_model);

    public function updateSingleTracker(Request $request, string $tracker_model);

    public function updatebulkTrackerByChild(Request $request, string $tracker_model);

    public function deleteBulkTrackerByChild(Request $request, string $tracker_model);

    public function deleteTrackerByID(Request $request, string $tracker_model);

    public function updatebulkTracker(Request $request, string $tracker_model);

    public function import(Request $request, string $schedule_model, string $orgModel);

    public function importForBranch(string $branchId , string $schedule_model);

    public function getAllSchedule();




}
