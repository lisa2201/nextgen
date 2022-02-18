<?php

namespace Kinderm8\Repositories\Fee;

use Illuminate\Http\Request;

interface IFeeRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $visibility = true);

    public function list(Request $request);

    public function store(Request $request, array $roomIds);

    public function findById($id, array $depends = [], bool $withTrashed = true);

    public function update(string $id, Request $request, array $roomIds);

    public function delete(string $id);

    public function updateStatus(string $id, Request $request);

    /*----------------------------------------------------------*/

    public function getAdjusted(string $fee_id, array $args, array $depends, Request $request, bool $withTrashed = false);

    public function getAdjustedList(Request $request, array $depends = [], bool $throwable = false);

    public function findAdjustedById($id, array $depends = [], array $args = [], bool $withTrashed = true);

    public function storeAdjustFee(Request $request);

    public function deleteAdjustedFee(string $id);

    public function getAdjustedFeeByFeeDate(string $fee_id, string $date);
}
