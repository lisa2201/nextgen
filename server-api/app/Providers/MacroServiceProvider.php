<?php

namespace Kinderm8\Providers;

use Arr;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\ServiceProvider;
use Str;

class MacroServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        $this->model_query_macros();
    }

    protected function model_query_macros()
    {
        Builder::macro('whereLike', function($columns, $search)
        {
            $this->where(function($query) use ($columns, $search)
            {
                foreach(Arr::wrap($columns) as $column)
                {
                    $query->orWhere($column, 'ILIKE', "%{$search}%");
                }
            });

            return $this;
        });
    }

    protected function query_profiling_macros()
    {
        Builder::macro("toSqlWithBindings", function()
        {
            $sql = $this->toSql();

            foreach($this->getBindings() as $binding)
            {
                $value = is_numeric($binding) ? $binding : "'$binding'";
                $sql = preg_replace('/\?/', $value, $sql, 1);
            }

            return $sql;
        });

        Builder::macro("dd", function()
        {
            if (func_num_args() === 1)
            {
                $message = func_get_arg(0);
            }

            var_dump((empty($message) ? "" : $message . ": ") . $this->toSqlWithBindings());

            dd($this->get());
        });

        Builder::macro("dump", function()
        {
            if (func_num_args() === 1)
            {
                $message = func_get_arg(0);
            }

            var_dump((empty($message) ? "" : $message . ": ") . $this->toSqlWithBindings());

            return $this;
        });

        Builder::macro("log", function()
        {
            if (func_num_args() === 1)
            {
                $message = func_get_arg(0);
            }

            Log::debug((empty($message) ? "" : $message . ": ") . $this->toSqlWithBindings());

            return $this;
        });
    }
}
