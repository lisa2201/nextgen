<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SendPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $expiry;
    public $url;

    /**
     * Create a new message instance.
     *
     * @param Model $user
     * @param $expiry
     * @param $url
     */
    public function __construct(Model $user, $expiry, $url)
    {
        $this->user = $user;
        $this->expiry = $expiry;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.forgot_password');
    }
}
