<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProviderSetup extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_providers';

    protected $fillable = [
        'id',
        'buisness_name',
        'legal_name',
        'name_type',
        'entity_type',
        'ABN',
        'registration_code',
        'date_of_event',
        'mobile',
        'email',
        'address',
        'financial',
        'contact',
        'services'
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
    protected $appends = [
        'index'
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
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [];


    /*---------------------------- Accessor ----------------------------*/

    public function getIndexAttribute()
    {
        return ($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*---------------------------- Functions ------------------------------*/


    /*--------------------------- Relationships -----------------------------------*/

    public function services()
    {
        return $this->hasMany(ServiceSetup::class, 'provider_id')->withTrashed();
    }

    public function ccsSetup()
    {
        return $this->belongsTo(CcsSetup::class, 'ccs_setup_id')->withTrashed();
    }
}
