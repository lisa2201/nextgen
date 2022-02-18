<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChildSchoolBus extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_school_bus';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = ['deleted_at'];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'id'
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */

    protected $fillable = [
        'school_id',
        'bus_id',
        'child_id'
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index'
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

    /*----------------------------- Relationships -----------------------*/

    public function school()
    {
        return $this->hasOne(School::class,'id','school_id')->withTrashed();
    }

    public function bus()
    {
        return $this->hasOne(Bus::class,'id', 'bus_id');
    }

    public function room()
    {
        return $this->hasOne(Room::class,'id', 'room_id');
    }

}