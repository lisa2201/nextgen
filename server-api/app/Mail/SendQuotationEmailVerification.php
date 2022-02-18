<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Kinderm8\QuotationVerification as Code;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Organization;
use Kinderm8\OrganizationSubscription;

class SendQuotationEmailVerification extends Mailable
{
    use Queueable, SerializesModels;

    public $organization;
    public $code;
    public $url;
    public $subscriptions;
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(Organization $organization, Code $code, $url, $subscriptions)
    {
        $this->organization = $organization;
        $this->code = $code;
        $this->url = $url;
        $this->subscriptions = $subscriptions;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.quotation_verification');
    }
}
