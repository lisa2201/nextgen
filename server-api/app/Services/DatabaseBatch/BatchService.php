<?php

namespace Kinderm8\Services\DatabaseBatch;

use DB;
use DBHelper;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Eloquent\Model;
use Throwable;

class BatchService implements BatchContract
{
    private $db;

    public function __construct(DatabaseManager $db)
    {
        $this->db = $db;
    }

    /**
     * Update multiple rows
     * $userInstance = new \App\Models\User;
     * $value = [
     *     [
     *         'id' => 1,
     *         'status' => 'active',
     *         'nickname' => 'Smith'
     *     ],
     *     [
     *         'id' => 5,
     *         'status' => 'deactive',
     *         'nickname' => 'Lee'
     *     ],
     *     [
     *         'id' => 7,
     *         'balance' => ['+', 500]
     *     ]
     * ];
     * $index = 'id';
     * Batch::update($userInstance, $value, $index);
     *
     * @param Model $table
     * @param array $values
     * @param string $index
     * @param bool $raw
     * @return bool|int
     */
    public function update(Model $table, array $values, string $index = null, bool $raw = false)
    {
        $final = [];
        $ids = [];

        if (!count($values))
        {
            return false;
        }

        if (!isset($index) || empty($index))
        {
            $index = $table->getKeyName();
        }

        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        foreach ($values as $key => $val)
        {
            $ids[] = $val[$index];

            if ($table->usesTimestamps())
            {
                $updatedAtColumn = $table->getUpdatedAtColumn();

                if (!isset($val[$updatedAtColumn]))
                {
                    $val[$updatedAtColumn] = now()->format($table->getDateFormat());
                }
            }

            foreach (array_keys($val) as $field)
            {
                if ($field !== $index)
                {
                    if (gettype($val[$field]) == 'array')
                    {
                        $value = "'" . json_encode($val[$field]) . "'";
                    }
                    else
                    {
                        $finalField = $raw ? DBHelper::mysql_escape($val[$field]) : "'" . DBHelper::mysql_escape($val[$field]) . "'";
                        $value = (is_null($val[$field]) ? 'NULL' : $finalField);
                    }

                    if ($driver == 'pgsql')
                        $final[$field][] = 'WHEN ' . $index . ' = \'' . $val[$index] . '\' THEN ' . $value . ' ';
                    else
                        $final[$field][] = 'WHEN `' . $index . '` = \'' . $val[$index] . '\' THEN ' . $value . ' ';
                }
            }
        }

        if ($driver == 'pgsql')
        {
            $cases = '';
            foreach ($final as $k => $v)
            {
                $cases .= '"' . $k . '" = (CASE ' . implode("\n", $v) . "\n"
                    . 'ELSE "' . $k . '" END), ';
            }

            $query = "UPDATE \"" . $this->getFullTableName($table) . '" SET ' . substr($cases, 0, -2) . " WHERE \"$index\" IN('" . implode("','", $ids) . "');";
        }
        else
        {
            $cases = '';
            foreach ($final as $k => $v)
            {
                $cases .= '`' . $k . '` = (CASE ' . implode("\n", $v) . "\n"
                    . 'ELSE `' . $k . '` END), ';
            }

            $query = "UPDATE `" . $this->getFullTableName($table) . "` SET " . substr($cases, 0, -2) . " WHERE `$index` IN(" . '"' . implode('","', $ids) . '"' . ");";
        }

        return $this->db->connection($this->getConnectionName($table))->update($query);
    }

    /**
     * Update multiple rows
     * @param Model $table
     * @param array $values
     * @param string|null $index
     * @param string|null $index2
     * @param bool $raw
     * @return bool|int
     *
     * $table = 'users';
     * $value = [
     *     [
     *         'id' => 1,
     *         'status' => 'active',
     *         'nickname' => 'Smith'
     *     ] ,
     *     [
     *         'id' => 5,
     *         'status' => 'deactive',
     *         'nickname' => 'Lee'
     *     ] ,
     * ];
     * $index = 'id';
     * $index2 = 'user_id';
     */
    public function updateWithTwoIndex(Model $table, array $values, string $index = null, string $index2 = null, bool $raw = false)
    {
        $final = [];
        $ids = [];

        if (!count($values))
        {
            return false;
        }

        if (!isset($index) || empty($index))
        {
            $index = $table->getKeyName();
        }

        foreach ($values as $key => $val)
        {
            $ids[] = $val[$index];
            $ids2[] = $val[$index2];

            foreach (array_keys($val) as $field)
            {
                if ($field !== $index || $field !== $index2)
                {
                    $finalField = $raw ? DBHelper::mysql_escape($val[$field]) : '"' . DBHelper::mysql_escape($val[$field]) . '"';
                    $value = (is_null($val[$field]) ? 'NULL' : $finalField);
                    $final[$field][] = 'WHEN (`' . $index . '` = "' . DBHelper::mysql_escape($val[$index]) . '" AND `' . $index2 . '` = "' . $val[$index2] . '") THEN ' . $value . ' ';
                }
            }
        }

        $cases = '';
        foreach ($final as $k => $v)
        {
            $cases .= '`' . $k . '` = (CASE ' . implode("\n", $v) . "\n"
                . 'ELSE `' . $k . '` END), ';
        }

        $query = "UPDATE `" . $this->getFullTableName($table) . "` SET " . substr($cases, 0, -2) . " WHERE `$index` IN(" . '"' . implode('","', $ids) . '")' . " AND `$index2` IN(" . '"' . implode('","', $ids2) . '"' . " );";

        return $this->db->connection($this->getConnectionName($table))->update($query);
    }

    /**
     * Insert Multi rows.
     *
     * @param Model $table
     * @param array $columns
     * @param array $values
     * @param int $batchSize
     * @param bool $insertIgnore
     * @return bool|mixed
     * @throws Throwable
     *
     * $table = 'users';
     * $columns = [
     *      'firstName',
     *      'lastName',
     *      'email',
     *      'isActive',
     *      'status',
     * ];
     * $values = [
     *     [
     *         'Sam',
     *         'Lee',
     *         'emailSample_1@gmail.com',
     *         '1',
     *         '0',
     *     ] ,
     *     [
     *         'Anna',
     *         'Smith',
     *         'emailSample_2@gmail.com',
     *         '1',
     *         '0',
     *     ] ,
     *     [
     *         'Lee',
     *         'Smith',
     *         'emailSample_3@gmail.com',
     *         '1',
     *         '0',
     *     ] ,
     * ];
     * $batchSize = 500; // insert 500 (default), 100 minimum rows in one query
     */
    public function insert(Model $table, array $columns, array $values, int $batchSize = 500, bool $insertIgnore = false)
    {
        // no need for the old validation since we now use type hint that supports from php 7.0
        // but I kept this one
        if (count($columns) !== count($values[0]))
        {
            return false;
        }

        $query = [];
        $minChunck = 100;

        $totalValues = count($values);
        $batchSizeInsert = ($totalValues < $batchSize && $batchSize < $minChunck) ? $minChunck : $batchSize;

        $totalChunk = ($batchSizeInsert < $minChunck) ? $minChunck : $batchSizeInsert;

        $values = array_chunk($values, $totalChunk, true);

        if ($table->usesTimestamps())
        {
            $createdAtColumn = $table->getCreatedAtColumn();
            $updatedAtColumn = $table->getUpdatedAtColumn();
            $now = now()->format($table->getDateFormat());

            $addCreatedAtValue = false;
            $addUpdatedAtValue = false;

            if (!in_array($createdAtColumn, $columns))
            {
                $addCreatedAtValue = true;
                array_push($columns, $createdAtColumn);
            }

            if (!in_array($updatedAtColumn, $columns))
            {
                $addUpdatedAtValue = true;
                array_push($columns, $updatedAtColumn);
            }

            foreach ($values as $key => $value)
            {
                foreach ($value as $rowKey => $row)
                {
                    if ($addCreatedAtValue)
                    {
                        array_push($values[$key][$rowKey], $now);
                    }

                    if ($addUpdatedAtValue)
                    {
                        array_push($values[$key][$rowKey], $now);
                    }
                }
            }
        }

        foreach ($columns as $key => $column)
        {
            $columns[$key] = '`' . DBHelper::mysql_escape($column) . '`';
        }

        foreach ($values as $value)
        {
            $valueArray = [];
            foreach ($value as $data)
            {
                foreach ($data as $key => $item)
                {
                    $item = is_null($item) ? 'NULL' : "'" . DBHelper::mysql_escape($item) . "'";
                    $data[$key] = $item;
                }

                $valueArray[] = '(' . implode(',', $data) . ')';
            }

            $valueString = implode(', ', $valueArray);

            $ignoreStmt = $insertIgnore ? ' IGNORE ' : '';

            $query[] = 'INSERT ' . $ignoreStmt . ' INTO `' . $this->getFullTableName($table) . '` (' . implode(',', $columns) . ") VALUES $valueString;";
        }

        if (count($query))
        {
            return $this->db->transaction(function () use ($totalValues, $totalChunk, $query, $table)
            {
                $totalQuery = 0;

                foreach ($query as $value)
                {
                    $totalQuery += $this->db->connection($this->getConnectionName($table))->statement($value) ? 1 : 0;
                }

                return [
                    'totalRows' => $totalValues,
                    'totalBatch' => $totalChunk,
                    'totalQuery' => $totalQuery
                ];
            });
        }

        return false;
    }

    /**
     * Get full table name.
     *
     * @param Model $model
     * @return string
     */
    private function getFullTableName(Model $model)
    {
        return $model->getConnection()->getTablePrefix() . $model->getTable();
    }

    /**
     * Get connection name.
     *
     * @param Model $model
     * @return string|null
     */
    private function getConnectionName(Model $model)
    {
        if (!is_null($cn = $model->getConnectionName()))
        {
            return $cn;
        }

        return $model->getConnection()->getName();
    }
}
