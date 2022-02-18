<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Kinderm8\Mail\SendEnrollmentForm as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendEnrollmentForm extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $branch_name;
    protected $logo;

    /**
     * Create a new notification instance.
     *
     * @param $request_url
     */
    public function __construct(string $branch_name, string $logo, string $request_url)
    {
        $this->branch_name = $branch_name;
        $this->logo = $logo;
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
        return (new Mailable($notifiable, $this->branch_name, $this->logo, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.enrollment_form'))
            ->to($notifiable->waitlist_info['email'])
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
