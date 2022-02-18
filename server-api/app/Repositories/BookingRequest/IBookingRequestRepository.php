<?php

namespace Kinderm8\Repositories\BookingRequest;

use Illuminate\Http\Request;

interface IBookingRequestRepository
{
    public function get(array $args, array $depends, Request $request, bool $withTrashed = false, bool $throwable = false);

    public function list(array $args, Request $request);

    public function store(Request $request);

    public function findById($id, array $depends);

    public function update(string $id, Request $request);

    public function delete(string $id);

    public function exists(Request $request);
}
