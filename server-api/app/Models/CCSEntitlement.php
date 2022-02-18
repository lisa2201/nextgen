<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CCSEntitlement extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_ccs_entitlements';

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
        'enrolment_id',
        'date',
        'ccs_percentage',
        'ccs_withholding_percentage',
        'ccs_total_hours',
        'apportioned_hours',
        'accs_hourly_rate_cap_increase',
        'annual_cap_reached',
        'absence_count',
        'pre_school_excemption'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'ccs_percentage' => 'double',
        'ccs_withholding_percentage' => 'double',
        'ccs_total_hours' => 'integer',
        'apportioned_hours' => 'integer',
        'accs_hourly_rate_cap_increase' => 'double',
        'absence_count' => 'integer'
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

    public function getChildEnrolment()
    {
        return $this->belongsTo(CCSEnrolment::class,'enrolment_id', 'enrolment_id')->withTrashed();
    }
}
