<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;

class BillingCycle extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_billing_cycles';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'organization_id',
        'start_date',
        'end_date',
        'child_count',
        'staff_count',
        'user_count',
        'status'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id', 'organization_id'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index','org_id'];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'start_date',
        'end_date'
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

    public function getOrgIdAttribute()
    {
        return ($this->organization != null) ? $this->organization->index : '';
    }


    /*---------------------------- Scopes ------------------------------*/



    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

}
