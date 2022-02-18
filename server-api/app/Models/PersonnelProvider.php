<?php

namespace Kinderm8;
use Arr;
use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;

class PersonnelProvider extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_provider_personnel';

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

    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id', 'pivot','user_id'];

    /**

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'user_id'
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

    // public function getBranchIndexAttribute()
    // {
    //     return ($this->attributes['branch_id'] != null) ? Helpers::hxCode($this->attributes['branch_id']) : $this->attributes['branch_id'];
    // }

    public function getUserIndexAttribute()
    {
        return ($this->attributes['user_id'] != null) ? Helpers::hxCode($this->attributes['user_id']) : $this->attributes['user_id'];
    }

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*---------------------------- Functions ------------------------------*/


    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function provider()
    {
        return $this->belongsTo(ProviderSetup::class, 'provider_setup_id')->withTrashed();
    }
}
