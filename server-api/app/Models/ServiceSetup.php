<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceSetup extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_services';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */


    protected $fillable = [
        'id',
        'service_id',
        'service_type',
        'no_of_weeks',
        'start_date',
        'end_date',
        'ACECQARegistrationCode',
        'ACECQAExemptionReason',
        'service_name',
        'service_approvel_status',
        'start_date',
        'end_date',
        'address',
        'financial',
        'contact',
        'services'
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'date_of_event',
        'deleted_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'address' => 'array',
        'credentials' => 'array'
    ];

    /*---------------------------- Accessor ----------------------------*/

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

    public function provider()
    {
        return $this->belongsTo(ProviderSetup::class)->withTrashed();
    }

    public function branch()
    {
        return $this->hasOne(Branch::class)->withTrashed();
    }
}
