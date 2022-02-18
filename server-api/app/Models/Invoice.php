<?php

namespace Kinderm8;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{

    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_invoices';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'organization_id',
        'start_date',
        'end_date',
        'child_count',
        'staff_count',
        'user_count',
        'branch_count',
        'number',
        'sequence_number',
        'due_date',
        'status',
        'subtotal',
        'properties',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'due_date',
        'start_date',
        'end_date',

    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'subtotal' => 'float',
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
    protected $appends = ['index', 'org_id', 'bill_cycle_id'];


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

    public function getBillCycleIdAttribute()
    {
        return ($this->billing_cycle != null) ? $this->billing_cycle->index : '';
    }


    /*---------------------------- Scopes ------------------------------*/



    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function invoice_items()
    {
        return $this->hasMany('Kinderm8\InvoiceItem');
    }

    public function billing_cycle()
    {
        return $this->belongsTo('Kinderm8\BillingCycle');
    }
}
