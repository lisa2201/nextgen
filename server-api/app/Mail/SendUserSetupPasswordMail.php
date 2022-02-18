<?php

namespace Kinderm8\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SendUserSetupPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $branchUrl;
    public $url;
    public $user;
    public $branch;
    public $org;

    /**
     * Create a new notification instance.
     *
     * @param Model $user
     * @param $branchUrl
     * @param Model $org
     * @param Model $branch
     * @param $url
     */
    public function __construct(Model $user, $branchUrl, Model $org, Model $branch,  $url)
    {
        $this->user = $user;
        $this->branchUrl = $branchUrl;
        $this->org = $org;
        $this->branch = $branch;
        $this->url = $url;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.user.user_password_setup');
    }
}
