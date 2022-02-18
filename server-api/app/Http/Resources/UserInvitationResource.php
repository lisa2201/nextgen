<?php

namespace Kinderm8\Http\Resources;
use DateTimeHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\Resource;

class UserInvitationResource extends Resource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource, $params = [])
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        if(array_key_exists("basic", $this->params) && $this->params['basic'])
        {
            $prop = [
                'id' => $this->index,
                'email' => $this->user_email,
                'expired' => $this->isExpired(),
                'color' => $this->user_type,
                'childId' => $this->child
            ];
        }

        else if(array_key_exists('passwordSetup', $this->params) && $this->params['passwordSetup'])
        {
            $prop = [
                'id' => $this->index,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'email' => $this->email,'created' => ($this->created_at) ? DateTimeHelper::getTimezoneDatetime($this->created_at, $this->timezone)->toDateString() : '',
                'date'=>$this->invitation_date,
                'is_expire_invitation'=>$this->isExpired(),
                'email_verified' => $this->email_verified,
                'is_loged'=>$this->first_time_login
            ];
        }

        else
        {
            $prop = [
                'id' => $this->index,
                'email' => $this->user_email,
                'organization' => $this->organization->company_name,
                'branch' => !is_null($this->branch) ? $this->branch->name : null,
                'branch_id' => !is_null($this->branch) ? $this->branch->index : null,
                'account_created' => $this->created_at->toDateString(),
                'expired_on' => $this->expires_at->toDateString(),
                'expired' => $this->isExpired(),
                'role_data' => $this->roles_parsed,
                'childId' => $this->child,
                'has_owner_access' => ($this->site_manager === '1')
            ];
        }

        return $prop;
    }
}
