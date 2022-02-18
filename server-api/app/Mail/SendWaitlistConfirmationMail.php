<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\WaitListEnrollment;

class SendWaitlistConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $waitlistobj;
    public $branch;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(WaitListEnrollment $waitlistobj, string $branch)
    {
        $this->waitlistobj = $waitlistobj;
        $this->branch = $branch;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.wait_list_confirmation');
    }
}
