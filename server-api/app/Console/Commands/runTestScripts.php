<?php

namespace Kinderm8\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Output\BufferedOutput;

class runTestScripts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'c:test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        try
        {
            $this->call('migrate:fresh');

            $this->info(' ');

            $this->call('db:seed');

            $this->info(' ');

            $this->call('command:test-org-approve');

            $this->info(' ');

            $exitCode = Artisan::call('cache:clear');

            $exitCode = Artisan::call('passport:install');

            $exitCode = Artisan::call('config:cache');

            $this->info('task completed!');
        }
        catch(Exception $e)
        {
            $this->error($e->getMessage());
        }

        return true;
    }
}
