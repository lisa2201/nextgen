<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\CCSEnrolment;

class ParentEnrolmentConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $enrolmentObj;
    public $url;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(CCSEnrolment $enrolment, $url)
    {
        $this->enrolmentObj = $enrolment;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.enrolment.parent-confirmation');
    }
}
