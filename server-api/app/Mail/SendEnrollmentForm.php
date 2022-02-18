<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\WaitListEnrollment;

class SendEnrollmentForm extends Mailable
{
    use Queueable, SerializesModels;

    public $enrolObj;
    public $branch_name;
    public $branch_logo;
    public $url;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(WaitListEnrollment $enrol, $branch_name,$branch_logo, $url)
    {
        $this->enrolObj = $enrol;
        $this->branch_name = $branch_name;
        $this->branch_logo = $branch_logo;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.parent_enrollment_form');
    }
}
