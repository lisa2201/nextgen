<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_organization_branch';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = ['deleted_at', 'start_date'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'organization_id',
        'subdomain_name',
        'name',
        'phone_number',
        'fax_number',
        'address_1',
        'address_2',
        'zip_code',
        'city',
        'country_code',
        'status',
        'timezone',
        'media_logo_id',
        'media_cover_id',
        'email',
        'description',
        'opening_hours',
        'kinderconnect',
        'pincode',
        'center_settings',
        'branch_logo'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'opening_hours' => 'array',
        'center_settings' => 'array'
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
    protected $appends = [
        'index',
        'org_id',
        'logo',
        'cover',
        'org_currency'
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

    public function getOrgCurrencyAttribute()
    {
        return $this->organization->currency;
    }

    public function getLogoAttribute()
    {
        //return \MediaHelper::getMediaModelAttribute($this->attributes['media_logo_id']);
        return null;
    }

    public function getCoverAttribute()
    {
        //return \MediaHelper::getMediaModelAttribute($this->attributes['media_cover_id']);
        return null;
    }



    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*--------------------------- Relationships -----------------------------------*/

    public function user()
    {
        return $this->hasOne(User::class)->withTrashed();
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function providerService()
    {
        return $this->belongsTo(ServiceSetup::class, 'service_id')->withTrashed();
    }
}
