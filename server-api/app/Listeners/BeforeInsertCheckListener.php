<?php

namespace Kinderm8\Listeners;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Kinderm8\Events\BeforeInsertCheckEvent;

class BeforeInsertCheckListener
{
    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     *
     * @param  object  $event
     * @return void
     */
    public function handle(BeforeInsertCheckEvent $event)
    {
        $sequence_name = $event->model->getTable() . '_' . $event->model->getKeyName();

        // queries
        $get_last = $event->model->newQuery()->latest()->first();
        $sequence = DB::select("SELECT last_value FROM " . $sequence_name . "_seq;");

        // update table sequence
        if (!empty($sequence) && is_null($sequence['0']->last_value))
        {
            DB::statement("SELECT setval('" . $sequence_name . "_seq', " . (is_null($get_last) ? 1 : ($get_last->id + 1)) . ", true)");

            $this->updateLog($sequence_name, $get_last, $sequence);
        }
        else if (!empty($sequence) && !is_null($get_last) && intval($sequence['0']->last_value) !== $get_last->id)
        {
            DB::statement("SELECT setval('" . $sequence_name . "_seq', " . ($get_last->id + 1) . ", true)");

            $this->updateLog($sequence_name, $get_last, $sequence);
        }
    }

    /**
     * @param string $sequence_name
     * @param Model|null $get_last
     * @param array $sequence
     */
    protected function updateLog(string $sequence_name, ?Model $get_last, array $sequence)
    {
        Log::info('---------------------- START -----------------------');
        Log::info(now()->toDateTimeLocalString() . ' sequence (' . $sequence_name . ') updated.');
        Log::info('table data', !is_null($get_last) ? $get_last->toArray() : 'empty');
        Log::info('sequence data', $sequence);
        Log::info('----------------------- END ------------------------' . PHP_EOL . PHP_EOL);
    }
}
