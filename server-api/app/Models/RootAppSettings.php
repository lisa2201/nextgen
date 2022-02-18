<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;

class RootAppSettings extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_root_app_settings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [];

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

    /*---------------------------- Mutators ----------------------------*/

    /**
     * Get the user's first name.
     *
     * @param  string  $value
     * @return string
     */
    public function getValueAttribute($value)
    {
        if($this->attributes['type'] == 'boolean')
        {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        }
        else if($this->attributes['type'] == 'json')
        {
            return json_decode($value);
        }

        return ucfirst($value);
    }


    /*---------------------------- Scopes ------------------------------*/

}
