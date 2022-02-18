<?php

namespace Kinderm8;

use Helpers;

class Role extends \Spatie\Permission\Models\Role
{
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
    protected $appends = ['index', 'org_id', 'org_name'];

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

    public function getOrgIdAttribute()
    {
        return ($this->organization != null) ? $this->organization->index : '';
    }

    public function getOrgNameAttribute()
    {
        return ($this->organization != null) ? $this->organization->company_name : '';
    }

    /*---------------------------- Mutators ----------------------------*/

    /*---------------------------- Scopes ------------------------------*/

    /*---------------------------- Functions ------------------------------*/

    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }
}
