<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;
use Staudenmeir\EloquentEagerLimit\HasEagerLimit;

class FeeAdjusted extends Model
{
    use SoftDeletes;
    use HasEagerLimit;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_fees_adjusted';

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
        'fee_id',
        'net_amount',
        'gross_amount',
        'effective_date',
        'status',
        'future_bookings_updated'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id'];

    /**

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

    public function fee()
    {
         return $this->belongsTo(Fee::class, 'fee_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'adjusted_fee_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }
}
