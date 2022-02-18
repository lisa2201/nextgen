<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Branch;
use Kinderm8\Mail\SendWaitlistConfirmationMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendWaitlistConfirmationMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $branch;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(string $branch)
    {
        $this->branch = $branch;

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
        return (new Mailable($notifiable, $this->branch))
            ->subject(LocalizationHelper::getTranslatedText('email.waitlist_confirmation'))
            ->to($notifiable->waitlist_info['email'])
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
