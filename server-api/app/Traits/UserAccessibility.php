<?php

namespace Kinderm8\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;

trait UserAccessibility
{
    /**
     * @param Builder $query
     * @param null $overwrite_org_id
     * @param null $table_reference
     * @param bool $ignore_branch
     * @return Builder
     */
    protected function attachAccessibilityQuery(Builder $query, $overwrite_org_id = null, $table_reference = null, $ignore_branch = false): Builder
    {
        try
        {
            if (auth()->user()->isRoot())
            {
                if (!is_null($overwrite_org_id))
                {
                    $query->where((!is_null($table_reference) ? "{$table_reference}.organization_id" : "organization_id"), '=', $overwrite_org_id);
                }
            }
            else if (auth()->user()->hasOwnerAccess())
            {
                $query->where((!is_null($table_reference) ? "{$table_reference}.organization_id" : "organization_id"), '=', auth()->user()->organization_id);
            }
            else
            {
                $query->where((!is_null($table_reference) ? "{$table_reference}.organization_id" : "organization_id"), '=', auth()->user()->organization->id);

                if (!$ignore_branch)
                {
                    $query->where((!is_null($table_reference) ? "{$table_reference}.branch_id" : "branch_id"), '=', auth()->user()->branch->id);
                }
            }

            return $query;
        }
        catch(QueryException $e)
        {
            throw $e;
        }
    }

    /**
     * @param Builder $query
     * @param $index
     * @return Builder
     */
    protected function ignoreCurrentIndex(Builder $query, $index): Builder
    {
        try
        {
            $query->where('id', '!=', $index);

            return $query;
        }
        catch(QueryException $e)
        {
            throw $e;
        }
    }
}
