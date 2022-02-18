<?php

namespace Kinderm8;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganizationSubscription extends Model
{
    use SoftDeletes;

    /*---------------------------- DB ENUMS ----------------------------*/

    // Status ENUMS
    const ON_TRIAL_STATUS = 'on_trial';
    const ACTIVE_STATUS = 'active';
    const INACTIVE_STATUS = 'inactive';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_organization_subscriptions';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'trial_end_date',
        'addon_start_date',
        'deleted_at'
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'org_id',
        'addon_id',
        'price',
        'price_type',
        'unit_type',
        'minimum_price',
        'trial_period',
        'trial_end_date',
        'addon_start_date',
        'properties',
        'status'
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
    protected $hidden = ['id', 'pivot'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index'];


    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @param $value
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
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function addon()
    {
        return $this->belongsTo('Kinderm8\Addon','addon_id');
    }

}
