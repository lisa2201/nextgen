<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Kinderm8\Mail\SendResetPasswordMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendResetPasswordMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $password;
    protected $url;

    /**
     * Create a new notification instance.
     *
     * @param string $password
     * @param string $url
     */
    public function __construct(string $password, string $url)
    {
        $this->password = $password;
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
        return (new Mailable($notifiable, $this->password, $this->url))
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
