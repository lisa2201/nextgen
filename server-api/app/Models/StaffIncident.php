<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Helpers;
use Kinderm8\Branch;
use Kinderm8\Organization;

class StaffIncident extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_staff_incident';

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
        'branch_id'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'person_completing' => 'array',
        'witness_details' => 'array',
        'incident_details' => 'array',
        'notifications' => 'array',
        'followup_requirments' => 'array',
        'supervisors_acknowledgement' => 'array'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['organization_id', 'branch_id'];
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

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }
}
