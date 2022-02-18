<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\UserInvitationAccepted as Mailable;
use LocalizationHelper;
use QueueHelper;

class UserInvitationAcceptMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $urls;
    protected $is_owner_request;
    protected $full_path;
    protected $pincode;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(array $urls, bool $is_owner_request, string $full_path, string $pincode)
    {
        $this->urls = $urls;
        $this->is_owner_request = $is_owner_request;
        $this->full_path = $full_path;
        $this->pincode = $pincode;
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
        return (new Mailable($notifiable, $this->urls, $this->is_owner_request, $this->full_path, $this->pincode))
            ->subject(LocalizationHelper::getTranslatedText('email.invitation_accept_subject'))
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
