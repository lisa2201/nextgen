<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Helpers;

class HealthAndMedical extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var 
     */
    protected $table = 'km8_child_health_and_medical';

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
        'ref_no',
        'medicare_expiry_date',
        'ambulance_cover_no',
        'health_center',
        'service_name',
        'service_phone_no',
        'service_address',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index','child'];



    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @param $value
     * @return string
     */
    public function getIndexAttribute()
    {
        return (!is_null($this->attributes['id'])) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function getChildAttribute()
    {
        return (!is_null($this->attributes['child_id'])) ? Helpers::hxCode($this->attributes['child_id']) : $this->attributes['child_id'];
    }
}
