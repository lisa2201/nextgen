<?php

namespace Kinderm8\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class updateSequenceOnRollBackEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $model_name;

    /**
     * Create a new event instance.
     *
     * @param string $model_name
     */
    public function __construct(string $model_name)
    {
        $this->model_name = $model_name;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel|array
     */
    public function broadcastOn()
    {
        return new PrivateChannel('channel-name');
    }
}
