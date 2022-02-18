<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Watson\Rememberable\Rememberable;

class BondPayment extends Model
{
    use Notifiable,
        Rememberable,
        SoftDeletes,
        HasRoles;

    protected $guard_name = 'api';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_bond_payemt';

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
        'branch_id',
        'amount',
        'user_id',
        'child_id',
        'comments',
        'type',
        'date',
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

    public function child()
    {
        return $this->belongsTo('Kinderm8\Child')->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo('Kinderm8\User')->withTrashed();
    }

}
