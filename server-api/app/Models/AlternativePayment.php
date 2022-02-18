<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Helpers;

class AlternativePayment extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_alternative_payment';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    // protected $dates = ['deleted_at'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */

    protected $fillable = [
        'organization_id',
        'alternativePaymentArrangementID',
        'properties',
        'created_by'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'properties' => 'array',
        'syncerror' => 'array'
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'created_id',
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

    /**
     * encrypt created user id
     * @param $value
     * @return string
     */

    public function getCreatedIdAttribute()
    {
        return ($this->attributes['created_by'] != null) ? Helpers::hxCode($this->attributes['created_by']) : $this->attributes['created_by'];
    }


    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function provider()
    {
        return $this->belongsTo(ProviderSetup::class, 'provider_setup_id')->withTrashed();
    }

}
