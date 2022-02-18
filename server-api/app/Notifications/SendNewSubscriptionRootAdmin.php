<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\NewSubscriptionRootAdmin as Mailable;
use Kinderm8\Organization;
use LocalizationHelper;
use QueueHelper;

class SendNewSubscriptionRootAdmin extends Notification implements ShouldQueue
{
    use Queueable;

    protected $org;
    protected $url;

    /**
     * Create a new notification instance.
     *
     * @param Organization $org
     * @param $url
     */
    public function __construct(Organization $org, $url)
    {
        $this->org = $org;
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
        return (new Mailable($notifiable, $this->org, $this->url))
            ->subject(LocalizationHelper::getTranslatedText('email.email_new_subscription_root_admin'))
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
