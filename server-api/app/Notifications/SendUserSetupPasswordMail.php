<?php

namespace Kinderm8\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Kinderm8\Mail\SendUserSetupPasswordMail as Mailable;
use LocalizationHelper;
use QueueHelper;

class SendUserSetupPasswordMail extends Notification implements ShouldQueue
{
    use Queueable;

    protected $branchUrl;
    protected $request_url;
    protected $user;
    protected $branch;
    protected $org;

    /**
     * Create a new notification instance.
     *
     * @param Model $user
     * @param $branchUrl
     * @param Model $org
     * @param Model $branch
     * @param $request_url
     */
    public function __construct(Model $user, $branchUrl, Model $org, Model $branch,  $request_url)
    {
        $this->user = $user;
        $this->branchUrl = $branchUrl;
        $this->org = $org;
        $this->branch = $branch;
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
        return (new Mailable($notifiable, $this->branchUrl, $this->org, $this->branch, $this->request_url))
            ->subject(LocalizationHelper::getTranslatedText('email.invitation_password_setup'))
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
