<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Models\Enquiries;

class SendWaitlistForm extends Mailable
{
    use Queueable, SerializesModels;

    public $enquiryObj;
    public $url;
    public $branch_logo;
    public $branch_name;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(Enquiries $enquiry, $branch_logo,$branch_name, $url)
    {
        $this->enquiryObj = $enquiry;
        $this->url = $url;
        $this->branch_logo = $branch_logo;
        $this->branch_name = $branch_name;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.parent_waitlist_form');
    }
}
