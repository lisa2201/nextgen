<?php

namespace Kinderm8;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Notifications\Notifiable;
use Kinderm8\Enums\RoleType;
use Illuminate\Database\Eloquent\Model;

class UserInvitation extends Model
{
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_user_invitations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_email',
        'token',
        'role_data',
        'expires_at'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'role_data' => 'array'
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = ['expires_at'];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id', 'pivot'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'expiry_count',
        'email',
        'roles_parsed',
        'user_type',
        'child'
    ];

    /**
     * The relations to eager load on every query.
     *
     * @var array
     */
    protected $with = [
        'organization',
        'branch'
    ];

    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @return string
     */
    public function getIndexAttribute()
    {
        return ($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function getExpiryCountAttribute()
    {
        $startTime = Carbon::parse($this->attributes['updated_at']);
        $finishTime = Carbon::parse($this->attributes['expires_at']);
        return $finishTime->diffInDays($startTime);
    }

    public function getEmailAttribute()
    {
        return $this->attributes['user_email'];
    }

    public function getRolesParsedAttribute()
    {
        $array = [];

        try
        {
            foreach (json_decode($this->attributes['role_data'], true) as $role)
            {
                if($this->attributes['site_manager'] === '0')
                {
                    $array[Helpers::hxCode($role['branch'])] = [
                        'roles' => Helpers::hxCode($role['roles']),
                        'type' => $role['type']
                    ];
                }
                else
                {
                    array_push($array, Helpers::hxCode($role));
                }
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return $array;
    }

    public function getUserTypeAttribute()
    {
        try
        {
            $type = 'blue';

            if($this->attributes['site_manager'] === '0')
            {
                $list = array_count_values(array_column(json_decode($this->attributes['role_data'], true), 'type'));
                $value = max($list);

                $type = (array_search($value, $list) === RoleType::PARENTSPORTAL) ? 'green' : 'red';
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return $type;
    }

    public function getChildAttribute()
    {
        return ($this->attributes['child_id'] != null) ? Helpers::hxCode($this->attributes['child_id']) : $this->attributes['child_id'];
    }

    /*---------------------------- Functions ------------------------------*/

    /**
     * Check if code is expired.
     *
     * @return bool
     */
    public function isExpired()
    {
        return $this->expires_at ? Carbon::now()->gte(Carbon::parse($this->expires_at)) : false;
    }

    public function getRoleBranches()
    {
        return array_column($this->role_data, 'branch');
    }

    /*---------------------------- Scopes ------------------------------*/


    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
