<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_bookings';

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
        'branch_id',
        'child_id',
        'room_id',
        'fee_id',
        'date',
        'is_casual',
        'frequency',
        'status',
        'absence_reason',
        'type',
        'child_room_sync',
        'adjusted_fee_id',
        'booking_updated_on',
        'absence_document_held'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'id'
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
        return (isset($this->attributes['id'])) ? (($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id']) : null;
    }

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*---------------------------- Functions ------------------------------*/

    public function isHoliday()
    {
        return $this->status === '3';
    }

    public function isAbsent()
    {
        return $this->status === '2';
    }

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
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function room()
    {
        return $this->belongsTo(Room::class)->withTrashed();
    }

    public function child()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }

    public function fee()
    {
        return $this->belongsTo(Fee::class)->withTrashed();
    }

    public function fee_adjusted()
    {
        return $this->belongsTo(FeeAdjusted::class, 'adjusted_fee_id', 'id')->withTrashed();
    }

    public function attendance()
    {
        return $this->hasOne(ChildAttendance::class)->withTrashed();
    }

    public function booking_request()
    {
        return $this->hasOne(BookingRequest::class)->where('status', '1')->withTrashed();
    }
}
