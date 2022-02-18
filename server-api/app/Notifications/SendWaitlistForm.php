<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Mail\SendWaitlistForm as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendWaitlistForm extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $branch_logo;
    protected $branch_name;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(string $branch_logo,string $branch_name,string $request_url)
    {
        $this->branch_logo = $branch_logo;
        $this->branch_name = $branch_name;
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
        return (new Mailable($notifiable, $this->branch_logo, $this->branch_name, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.waitlist_form'))
            ->to($notifiable->enquiry_info['email'])
            ->delay((int)QueueHelper::QUEUE_DELAY_TIME);
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
