<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\SendCustPlanEmailVerification as Mailable;
use Kinderm8\EmailVerification as Code;
use LocalizationHelper;
use QueueHelper;


class SendCustPlanEmailVerification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $code;

    /**
     * Create a new notification instance.
     *
     * @param $request_url
     * @param Code $code
     */
    public function __construct($request_url, Code $code)
    {
        $this->request_url = $request_url;
        $this->code = $code;
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
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        return (new Mailable($notifiable, $this->code, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.email_verification_subject'))
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
