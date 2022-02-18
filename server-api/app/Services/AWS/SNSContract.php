<?php

namespace Kinderm8\Services\AWS;

interface SNSContract
{
    public function publishEvent(string $topic, array $data, string $subject);
}
