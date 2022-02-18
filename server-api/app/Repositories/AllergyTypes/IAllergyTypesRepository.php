<?php

namespace Kinderm8\Repositories\AllergyTypes;


use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IAllergyTypesRepository
{

    public function get(array $args, array $depends, Request $request, bool $withTrashed, string $organization = null);

    public function importDefaultType(int $org_id);

}
