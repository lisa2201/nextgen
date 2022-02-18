<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SendBranchAdminsBookingRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $booking_request;
    public $url;

    /**
     * Create a new message instance.
     *
     * @param Model $user
     * @param Model $booking_request
     * @param string $url
     */
    public function __construct(Model $user, Model $booking_request, string $url)
    {
        $this->user = $user;
        $this->booking_request = $booking_request;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.booking_request.administrator');
    }
}
