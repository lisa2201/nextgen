<?php

namespace Kinderm8\Repositories\PaymentTerms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

interface IPaymentTermsRepository
{

    public function findById(int $id);

    public function list(Request $request, array $args);

    public function store(Request $request);

    public function update(Request $request);

    public function updateStatus(Request $request);

    public function delete(int $id);

}
