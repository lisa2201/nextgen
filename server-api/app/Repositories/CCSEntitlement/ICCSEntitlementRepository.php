<?php

namespace Kinderm8\Repositories\CCSEntitlement;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface ICCSEntitlementRepository
{
   // public function get(array $args, Request $request, bool $withTrashed);

    public function list(array $args, Request $request);

    public function findById($id, array $depends);

    public function findByEnrolmentId($reference, array $depends, array $args);
}
