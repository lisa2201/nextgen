<?php

namespace Kinderm8\Repositories\ParentPaymentProvider;

use Illuminate\Http\Request;

interface IParentPaymentProviderRepository
{

    public function findById(int $id);

    public function list(Request $request, array $args);

    public function get(array $args, array $depends, Request $request, bool $withTrashed);

    public function store(Request $request);

    public function update(Request $request);

    public function delete(int $id);

}