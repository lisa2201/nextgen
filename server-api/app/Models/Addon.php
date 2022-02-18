<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;

class Addon extends Model
{

    // Unit Type ENUMS
    const CHILD_UNIT_TYPE = 'child';
    const EDUCATOR_UNIT_TYPE = 'educator';
    const BRANCH_UNIT_TYPE = 'branch';
    const FIXED_UNIT_TYPE = 'fixed';
    const CUSTOM_UNIT_TYPE = 'custom';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_addons';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'title',
        'description',
        'custom',
        'plugin',
        'country',
        'imageUrl',
        'price',
        'unit_type',
        'minimum_price',
        'trial_period',
        'properties',
        'status'
    ];

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

    /**
     * The attributes that should be casted to native types.
     *
     * @var array
     */
    protected $casts = [
        'custom' => 'boolean',
        'plugin' => 'boolean'
    ];

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


    /*--------------------------- Relationships -------------------------*/


}
