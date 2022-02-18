<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Helpers;

class EducatorRatio extends Model
{
    //
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_educator_ratio';

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
        'state',
        'age_group',
        'age_start',
        'age_end',
        'ratio_display',
        'ratio_decimal',
    ];
    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'id'
    ];

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
        return ($this->id != null) ? Helpers::hxCode($this->id) : $this->id;
    }


}
