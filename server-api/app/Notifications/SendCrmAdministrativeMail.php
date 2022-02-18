<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Branch;
use Kinderm8\Mail\SendCrmAdministrativeMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendCrmAdministrativeMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $branch;
    protected $form;
    protected $subject;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(Branch $branch, string $form, string $subject)
    {
        $this->branch = $branch;
        $this->form = $form;
        $this->subject = $subject;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param mixed $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param mixed $notifiable
     * @return Mailable
     */
    public function toMail($notifiable)
    {
        //\Log::info('toMail', $notifiable->toArray());
        return (new Mailable($notifiable, $this->branch, $this->form))
            ->subject($this->subject)
            ->to($notifiable->email)
            ->from(config('mail.from.address'), 'Kinder m8 CRM')
            ->delay((int)QueueHelper::QUEUE_DELAY_TIME);
    }

    /**
     * Get the array representation of the notification.
     *
     * @param mixed $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
