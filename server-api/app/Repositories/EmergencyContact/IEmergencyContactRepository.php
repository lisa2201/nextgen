<?php

namespace Kinderm8\Repositories\EmergencyContact;

use Illuminate\Http\Request;

interface IEmergencyContactRepository
{
    public function store(Request $request, string $id);

    public function update($id, Request $request);

    public function findById($id, array $depends);

    public function delete(string $id);

    public function getEmergencyContactsByChild(string $id);

    public function getEmergencyContactsByParent();

    public function getEmergencyContactsByUser(string $user_id);
}
