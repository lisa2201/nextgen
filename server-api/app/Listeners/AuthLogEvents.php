<?php

namespace Kinderm8\Listeners;

use DateTimeHelper;
use Helpers;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Enums\AuthLogType;
use Kinderm8\Events\AuthLogEventHandler;
use Kinderm8\UserLoginHistory;
use MobileDetectHelper;
use UserAgentParser;

class AuthLogEvents
{
    private $mobiledetect;
    private $useragent;

    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct(MobileDetectHelper $mobiledetect, UserAgentParser $useragent)
    {
        $this->mobiledetect = $mobiledetect;
        $this->useragent = $useragent;
    }

    /**
     * Handle the event.
     * Track user login history
     * @param  AuthLogEventHandler  $event
     * @return void
     */
    public function handle(AuthLogEventHandler $event)
    {
        $userhistory = new UserLoginHistory;

        $userhistory->user_id = $event->user->id;
        $userhistory->organization_id = !is_null($event->user->organization) ? $event->user->organization_id : null;
        $userhistory->branch_id = !is_null($event->user->branch) ? $event->user->branch_id : null;
        $userhistory->ip_address = Helpers::get_ip_address();
        $userhistory->device = $this->mobiledetect->detectDevice();
        $userhistory->user_agent = $this->useragent->detectUserAgent();
        $userhistory->type = $event->type;
        $userhistory->datetime = DateTimeHelper::getDatetimeNow();
        //$userhistory->parent_source = $this->getLoginParentActivity($event);

        $userhistory->save();
    }

    /**
     * @param AuthLogEventHandler $event
     * @return |null
     */
    protected function getLoginParentActivity(AuthLogEventHandler $event)
    {
        $parent_source = null;

        if ($event->type === AuthLogType::Logout)
        {
            $last = UserLoginHistory::where('user_id', '=', $event->user->id)
                ->where('type', AuthLogType::Login)
                ->take(1)
                ->orderBy('id', 'desc')
                ->get();

            if (count($last) > 0) $parent_source = $last[0]->id;

            unset($last);
        }

        return $parent_source;
    }
}
