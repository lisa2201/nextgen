<?php

namespace Kinderm8\Providers;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\ServiceProvider;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Services\AWS\SNSService;
use Kinderm8\Services\DatabaseBatch\BatchContract;
use Kinderm8\Services\DatabaseBatch\BatchService;

class Kinderm8ServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(BatchContract::class, function ($app)
        {
            return new BatchService($app->make(DatabaseManager::class));
        });

        $this->app->singleton(SNSContract::class, function ($app)
        {
            return new SNSService(new SnsClient([
                'version' => '2010-03-31',
                'region' => config('aws.region'),
                'credentials' => new Credentials(
                    config('aws.access_key'),
                    config('aws.secret_key')
                )
            ]));
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }
}
