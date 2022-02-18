<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Organization;

class SendCustomSubscriptionApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $organization;
    public $url;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(Organization $organization, $url)
    {
        $this->organization = $organization;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.custom_subscription_active');
    }
}
