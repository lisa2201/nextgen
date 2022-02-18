<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Organization;
use Kinderm8\User;

class OnEmailVerifiedAdmin extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $org;
    public $url;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(User $user, Organization $org, $url)
    {
        $this->user = $user;
        $this->org = $org;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.email_verified_admin');
    }
}
