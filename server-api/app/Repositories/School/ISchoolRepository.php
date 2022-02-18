<?php

namespace Kinderm8\Repositories\School;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface ISchoolRepository
{
    public function get($args, Request $request);

    public function store(Request $request);
    public function update($id, Request $request);
    public function delete(string $id);

 //   public function list($args, Request $request);

}
