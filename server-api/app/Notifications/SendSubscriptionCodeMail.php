<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\SendSubscriptionCodeMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendSubscriptionCodeMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($request_url)
    {
        $this->request_url = $request_url;
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
        //\Log::info('toMail', $notifiable->toArray());
        return (new Mailable($notifiable, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.subscription_verified_subject'))
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
