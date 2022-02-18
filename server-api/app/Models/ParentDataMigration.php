<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class ParentDataMigration extends Model
{
    //km8_data_migration_parent

    use SoftDeletes;

    protected $guard_name = 'api';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_data_migration_parent';

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
    protected $casts = [
        'data' => 'array'
    ];

    protected $fillable = [
        'organization_id',
        'branch_id',
        'data'
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
    protected $appends = [
        'index',
    ];

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

    public function branch()
    {
        return $this->belongsTo('Kinderm8\Branch')->withTrashed();
    }

}
