<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Mail\SendParentBookingRequestMail as Mailable;
use Illuminate\Notifications\Notification;
use LocalizationHelper;
use QueueHelper;

class SendParentBookingRequestMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $booking_request;
    protected $url;

    /**
     * Create a new notification instance.
     *
     * @param Model $booking_request
     * @param string $url
     */
    public function __construct(Model $booking_request, string $url)
    {
        $this->booking_request = $booking_request;
        $this->url = $url;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return Mailable
     */
    public function toMail($notifiable)
    {
        return (new Mailable($notifiable, $this->booking_request, $this->url))
            ->subject(LocalizationHelper::getTranslatedText('email.email_parent_booking_request_subject'))
            ->to($notifiable->email)
            ->delay((int) QueueHelper::QUEUE_DELAY_TIME);
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
