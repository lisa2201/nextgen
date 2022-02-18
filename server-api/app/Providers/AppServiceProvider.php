<?php

namespace Kinderm8\Providers;

use DB;
use Event;
use Exception;
use Illuminate\Support\ServiceProvider;
use Illuminate\Notifications\Channels\DatabaseChannel as IlluminateDatabaseChannel;
use Kinderm8\Channels\DatabaseChannel;
use Laravel\Passport\Passport;
use Log;
use PDOException;
use Schema;
use Validator;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        if ($this->app->environment() !== 'production')
        {
            $this->app->register(\Barryvdh\LaravelIdeHelper\IdeHelperServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->HandleDatabaseError();

        $this->setDefaultSettings();

        $this->setCustomValidators();

        $this->QueryProfiler();
    }

    protected function HandleDatabaseError()
    {
        if (app()->runningInConsole())
        {
            return;
        }

        // Handle database errors
        try
        {
            DB::connection()->getPdo();
        }
        catch (Exception $e)
        {
            Log::error("Could not connect to the database. Please check your configuration. error:" . $e->getMessage());

            abort($e instanceof PDOException ? 503 : 500);
        }
    }

    protected function setDefaultSettings()
    {
        //DB::enableQueryLog();

        Schema::defaultStringLength(191);

        Passport::ignoreMigrations();

        $this->app->instance(IlluminateDatabaseChannel::class, new DatabaseChannel);
    }

    protected function setCustomValidators()
    {
        Validator::extend('recaptcha', 'Kinderm8\\Validators\\ReCaptcha@validate');
    }

    protected function QueryProfiler()
    {
        if (app()->environment('local'))
        {
            DB::listen(
                function ($sql)
                {
                    foreach ($sql->bindings as $i => $binding)
                    {
                        if ($binding instanceof \DateTime)
                        {
                            $sql->bindings[$i] = $binding->format('\'Y-m-d H:i:s\'');
                        }
                        else
                        {
                            if (is_string($binding))
                            {
                                $sql->bindings[$i] = "'$binding'";
                            }
                        }
                    }

                    // Insert bindings into query
                    $query = str_replace(array('%', '?'), array('%%', '%s'), $sql->sql);

                    $query = vsprintf($query, $sql->bindings);

                    // Save the query to file
                    $logFile = fopen(
                        storage_path('logs' . DIRECTORY_SEPARATOR . date('Y-m-d') . '_query.log'),
                        'a+'
                    );

                    fwrite($logFile, date('Y-m-d H:i:s') . ': ' . $query . PHP_EOL);

                    fclose($logFile);
                }
            );
        }
    }
}
