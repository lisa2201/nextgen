<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class BookingRequest extends Model
{

    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_booking_request';

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
        'type',
        'request_type',
        'start_date',
        'end_date',
        'morning_days',
        'afternoon_days',
        'late_time',
        'late_desc',
        'status',
        'selected_week_days'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'days' => 'array',
        'selected_week_days' => 'array'
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

    /*---------------------------- Functions ------------------------------*/

    public function isAccepted()
    {
        return $this->status === '1';
    }

    public function isRejected()
    {
        return $this->status === '2';
    }

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


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

    public function booking()
    {
        return $this->belongsTo(Booking::class)->withTrashed();
    }
}
