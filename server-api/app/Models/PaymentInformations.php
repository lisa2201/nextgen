<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentInformations extends Model
{
    use SoftDeletes;

    const ACTIVE = '0';
    const INACTIVE = '1';

    const STRIPE = 'stripe';
    const EZIDEBIT = 'ezidebit';
    const MANUAL = 'manual';

    const CARD = 'card';
    const BANK = 'bank';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_payment_info';

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
        'payment_type',
        'ref_id',
        'properties',
        'first_name',
        'last_name',
        'phone',
        'address1',
        'address2',
        'zip_code',
        'city',
        'state',
        'country_code',
        'mode',
        'last4',
        'exp_month',
        'exp_year',
        'status'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'properties' => 'json'
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
     * @param $value
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
}
