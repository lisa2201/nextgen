<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Branch;
use Kinderm8\Models\Enquiries;
use Kinderm8\User;
use Kinderm8\WaitListEnrollment;

class SendCrmAdministrativeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $form;
    public $branch;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(User $user, Branch $branch, string $form)
    {
        $this->user = $user;
        $this->branch = $branch;
        $this->form = $form;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.crm_added_administrative');
    }
}
