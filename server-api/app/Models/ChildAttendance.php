<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChildAttendance extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_attendance';

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
        'drop_time',
        'drop_geo_coordinates',
        'drop_signature',
        'pick_time',
        'pick_geo_coordinates',
        'pick_signature'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [

    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'id',
        'pivot'
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

    /*---------------------------- Mutators ----------------------------*/

    /*---------------------------- Scopes ------------------------------*/

    /*---------------------------- Functions ------------------------------*/

    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_user')->withTrashed();
    }

    public function child()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class)->withTrashed();
    }

    public function dropper()
    {
        return $this->belongsTo(User::class, 'drop_user')->withTrashed();
    }

    public function picker()
    {
        return $this->belongsTo(User::class, 'pick_user')->withTrashed();
    }

    public function dropParent()
    {
        return $this->belongsTo(User::class, 'drop_parent')->withTrashed();
    }

    public function pickParent()
    {
        return $this->belongsTo(User::class, 'pick_parent')->withTrashed();
    }

    public function dropNote()
    {
        return $this->belongsTo(ChildNote::class, 'drop_child_note_id')->withTrashed();
    }

    public function pickNote()
    {
        return $this->belongsTo(ChildNote::class, 'pick_child_note_id')->withTrashed();
    }

    public function bus()
    {
        return $this->belongsTo(Bus::class, 'bus_id')->withTrashed();
    }

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id')->withTrashed();
    }

}
