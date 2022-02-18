<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Kinderm8\Mail\SendQuotationEmailVerification as Mailable;
use Kinderm8\OrganizationSubscription;
use Kinderm8\QuotationVerification as Code;
use LocalizationHelper;
use QueueHelper;

class SendQuotationVerification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $request_url;
    protected $code;
    protected $subscriptions;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($request_url, Code $code, $subscriptions)
    {
        $this->request_url = $request_url;
        $this->code = $code;
        $this->subscriptions = $subscriptions;
        
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
        return (new Mailable($notifiable, $this->code, $this->request_url, $this->subscriptions))
            ->subject(LocalizationHelper::getTranslatedText('email.quotation_verification_subject'))
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
