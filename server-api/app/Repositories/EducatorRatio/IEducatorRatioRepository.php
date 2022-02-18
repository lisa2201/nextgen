<?php

namespace Kinderm8\Repositories\EducatorRatio;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IEducatorRatioRepository
{
    public function get($args, Request $request);

 //   public function list($args, Request $request);

}
