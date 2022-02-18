<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\SubscriptionVerifyCode;

class SendSubscriptionCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $code;
    public $url;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(SubscriptionVerifyCode $code, $url)
    {
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
        return $this->markdown('emails.user.send_subscripition_code');
    }
}
