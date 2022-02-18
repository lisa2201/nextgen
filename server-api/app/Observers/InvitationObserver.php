<?php

namespace Kinderm8\Observers;

use Kinderm8\Notifications\SendUserInvitationMail;
use Kinderm8\UserInvitation;
use PathHelper;

class InvitationObserver
{
    /**
     * Handle the user invitation "created" event.
     *
     * @param UserInvitation $userInvitation
     * @return void
     */
    public function created(UserInvitation $userInvitation)
    {
        $userInvitation->notify(
            new SendUserInvitationMail(
                PathHelper::getUserInvitationPath(request()->fullUrl(), $userInvitation->token),
                auth()->user()->organization
            )
        );
    }

    /**
     * Handle the user invitation "updated" event.
     *
     * @param UserInvitation $userInvitation
     * @return void
     */
    public function updated(UserInvitation $userInvitation)
    {
        $userInvitation->notify(
            new SendUserInvitationMail(
                PathHelper::getUserInvitationPath(request()->fullUrl(), $userInvitation->token),
                auth()->user()->organization
            )
        );
    }

    /**
     * Handle the user invitation "deleted" event.
     *
     * @param UserInvitation $userInvitation
     * @return void
     */
    public function deleted(UserInvitation $userInvitation)
    {
        //
    }

    /**
     * Handle the user invitation "restored" event.
     *
     * @param UserInvitation $userInvitation
     * @return void
     */
    public function restored(UserInvitation $userInvitation)
    {
        //
    }

    /**
     * Handle the user invitation "force deleted" event.
     *
     * @param UserInvitation $userInvitation
     * @return void
     */
    public function forceDeleted(UserInvitation $userInvitation)
    {
        //
    }
}
