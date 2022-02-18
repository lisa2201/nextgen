<?php

namespace Kinderm8;

use Arr;
use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_rooms';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = ['deleted_at'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */

    protected $fillable = [
        'organization_id',
        'branch_id',
        'title',
        'description',
        'status',
        'staff_ratio'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['pivot'];

    /**

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'org_id'
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

    public function getOrgIdAttribute()
    {
        return ($this->organization != null) ? $this->organization->index : '';
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function staff()
    {
        return $this->belongsToMany(User::class, 'km8_room_to_user');
    }

    public function child()
    {
        return $this->belongsToMany(Child::class, 'km8_child_to_rooms');
    }

    public function roomCapacity()
    {
        return $this->hasMany(RoomCapacity::class, 'room_id')->orderBy('effective_date', 'desc');
    }

    /*---------------------------- Scopes ------------------------------*/

    public function scopeActive($query)
    {
        return $query->where('status', '=', '0');
    }

}
