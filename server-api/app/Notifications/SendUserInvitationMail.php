<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\SendUserInvitation as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendUserInvitationMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $org;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($request_url, $org)
    {
        $this->request_url = $request_url;
        $this->org = $org;
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
        return (new Mailable($notifiable, $this->org, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.invitation_subject'))
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
