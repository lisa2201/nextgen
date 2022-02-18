<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ParentPaymentAdjustmentsHeader extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_parent_payment_adjustments_headers';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'deleted_at'
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'organization_id',
        'branch_id',
        'item_id',
        'start_date',
        'end_date',
        'type',
        'amount',
        'comments',
        'frequency',
        'recurring'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id', 'organization_id', 'branch_id', 'item_id'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index'];

    /**
     * The attributes that should be casted to native types.
     *
     * @var array
     */
    protected $casts = [
        'amount' => 'double',
        'executed' => 'boolean',
        'scheduled' => 'boolean',
        'properties' => 'array'
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

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*--------------------------- Relationships -------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function item()
    {
        return $this->belongsTo('Kinderm8\AdjustmentItem')->withTrashed();
    }

    public function details()
    {
        return $this->hasMany('Kinderm8\ParentPaymentAdjustment', 'adjustments_header_id')->withTrashed();
    }
}
