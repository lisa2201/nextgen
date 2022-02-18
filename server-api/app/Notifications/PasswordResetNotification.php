<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Kinderm8\Mail\SendPasswordResetMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class PasswordResetNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $expiry;

    /**
     * Create a new notification instance.
     *
     * @param string $request_url
     */
    public function __construct(string $request_url)
    {
        $this->request_url = $request_url;
        $this->expiry = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');
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
        return (new Mailable($notifiable, $this->expiry, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.forget_password'))
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
