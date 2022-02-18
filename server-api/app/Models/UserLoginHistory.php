<?php

namespace Kinderm8;

use Carbon\Carbon;
use Helpers;
use Illuminate\Database\Eloquent\Model;

class UserLoginHistory extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_user_login_activities';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'organization_id',
        'branch_id',
        'ip_address',
        'device',
        'user_agent',
        'type',
        'datetime'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'device' => 'array',
        'user_agent' => 'array'
    ];

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
    protected $appends = ['index', 'user_type', 'time_difference'];

    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @param $value
     * @return string
     */
    public function getIndexAttribute()
    {
        return ($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function getUserTypeAttribute()
    {
        //return $this->user->roles;
        return [];
    }

    public function getTimeDifferenceAttribute()
    {
        if($this->attributes['parent_source'] != null)
        {
            $startTime = Carbon::parse($this->attributes['datetime']);
            $finishTime = Carbon::parse(UserLoginHistory::find($this->attributes['parent_source'])->datetime);
            return $finishTime->diffForHumans($startTime);
        }
        else
        {
            return null;
        }
    }

    /*---------------------------- Mutators ----------------------------*/



    /*---------------------------- Scopes ------------------------------*/

    public function scopeGetLogoutsByUser($query, $user_id = null, $limit = 0)
    {
        if ($user_id == null)
        {
            $user_id = auth()->user()->id;
        }

        $query->where('type', '=', 'logout')->where('user_id', '=', $user_id);

        if ($limit > 0)
        {
            $query->take($limit);
        }

        return $query;

    }

    public function scopeGetLoginsByUser($query, $user_id = null, $limit = 0)
    {
        if ($user_id == null)
        {
            $user_id = auth()->user()->id;
        }

        $query->where('type', '=', 'login')->where('user_id', '=', $user_id);

        if ($limit > 0)
        {
            $query->take($limit);
        }

        return $query;
    }


    /*--------------------------- Relationships -----------------------------------*/

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
