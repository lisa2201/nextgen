<?php

namespace Kinderm8\Services\DatabaseBatch;

use Illuminate\Database\Eloquent\Model;

interface BatchContract
{
    public function update(Model $table, array $values, string $index = null, bool $raw = false);

    public function updateWithTwoIndex(Model $table, array $values, string $index = null, string $index2 = null, bool $raw = false);

    public function insert(Model $table, array $columns, array $values, int $batchSize = 500, bool $insertIgnore = false);
}
