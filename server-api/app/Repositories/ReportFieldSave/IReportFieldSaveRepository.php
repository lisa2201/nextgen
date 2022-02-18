<?php

namespace Kinderm8\Repositories\ReportFieldSave;

use Illuminate\Http\Request;

interface IReportFieldSaveRepository
{

    public function saveField(Request $request);

    public function getField(Request $request);

    public function addFavorite( $id, Request $request);

    public function findById($id, array $depends);

    public function delete(string $id);

    public function updateName(string $id, string $name);

}
