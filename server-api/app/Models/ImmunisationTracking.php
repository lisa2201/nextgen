<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;

class ImmunisationTracking extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_immunisation_tracking';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'organization_id',
        'branch_id',
        'date',
        'child_id',
        'immunisation_id',
        'immunisation_schedule_id',
        'created_by'
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [

    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'schedule' => 'array'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index'];


    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @return string
     */
    public function getIndexAttribute()
    {
        return ($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function schedule()
    {
        return $this->belongsTo(ImmunisationSchedule::class, 'immunisation_schedule_id')->withTrashed();
    }

    public function immunisation()
    {
        return $this->belongsTo(Immunisation::class, 'immunisation_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function child()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }
}
