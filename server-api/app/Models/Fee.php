<?php

namespace Kinderm8;

use DateTimeHelper;
use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;
use Staudenmeir\EloquentEagerLimit\HasEagerLimit;

class Fee extends Model
{
    use SoftDeletes;
    use HasEagerLimit;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_fees';

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

    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'session_start' => 'integer',
        'session_end' => 'integer'
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

    /*--------------------------- Relationships -----------------------------------*/

    public function rooms()
    {
        return $this->belongsToMany(Room::class, 'km8_fee_to_rooms')->withTrashed();
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function adjusted()
    {
        return $this->hasMany(FeeAdjusted::class, 'fee_id');
    }

    public function adjusted_past_collection()
    {
        return $this->hasMany(FeeAdjusted::class, 'fee_id')
            ->where('status', '0')
            ->where('effective_date', '<=', DateTimeHelper::getTimezoneDatetime(now(), auth()->user()->timezone))
            ->orderBy('effective_date', 'DESC')
            ->limit(1);
    }

    public function adjusted_future_collection()
    {
        return $this->hasMany(FeeAdjusted::class, 'fee_id')
            ->where('status', '0')
            ->where('effective_date', '>', DateTimeHelper::getTimezoneDatetime(now(), auth()->user()->timezone))
            ->orderBy('effective_date', 'ASC')
            ->limit(1);
    }
}
