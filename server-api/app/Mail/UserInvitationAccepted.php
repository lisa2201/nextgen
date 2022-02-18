<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\User;

class UserInvitationAccepted extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $urls;
    public $is_owner_request;
    public $full_path;
    public $pincode;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(User $user, array $urls, bool $is_owner_request, string $full_path, string $pincode)
    {
        $this->user = $user;
        $this->urls = $urls;
        $this->is_owner_request = $is_owner_request;
        $this->full_path = $full_path;
        $this->pincode = $pincode;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.user_invitation_accepted');
    }
}
