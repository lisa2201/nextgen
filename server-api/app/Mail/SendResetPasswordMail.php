<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SendResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;
    public $url;

    /**
     * Create a new message instance.
     *
     * @param Model $user
     * @param string $password
     * @param string $url
     */
    public function __construct(Model $user, string $password, string $url)
    {
        $this->user = $user;
        $this->password = $password;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.reset_password');
    }
}
