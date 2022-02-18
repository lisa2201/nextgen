<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Kinderm8\EmailVerification as Code;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\User;

class SendCustPlanEmailVerification extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $code;
    public $url;
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(User $user, Code $code, $url)
    {
        $this->user = $user;
        $this->code = $code;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.cust_plan_email_verification');
    }
}
