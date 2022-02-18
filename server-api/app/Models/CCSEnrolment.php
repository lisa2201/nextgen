<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Staudenmeir\EloquentEagerLimit\HasEagerLimit;

class CCSEnrolment extends Model
{
    use SoftDeletes;
    use Notifiable;
    use HasEagerLimit;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_ccs_enrolment';

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
        'service_id',
        'enrolment_id',
        'status',
        'child_id',
        'parent_id',
        'enrollment_start_date',
        'enrollment_end_date',
        'late_submission_reason',
        'arrangement_type',
        'arrangement_type_note',
        'session_type',
        'session_type_state',
        'signing_party',
        'signing_party_individual_first_name',
        'signing_party_individual_last_name',
        'is_case_details',
        'notes',
        'session_routine',
        'initial_session_routine',
        'number_weeks_cycle',
        'is_synced',
        'parent_status',
        'created_by',
        'status_history',
        'reason_for_pea'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'session_routine' => 'array',
        'initial_session_routine' => 'array',
        'status_history' => 'array',
        'parent_confirm_details' => 'array',
        'syncerror' => 'array'
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
        return ($this->attributes['id'] != null) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    /*---------------------------- Mutators ----------------------------*/

    /*---------------------------- Scopes ------------------------------*/

    /*---------------------------- Functions ------------------------------*/

    public function isEnrolmentClosed()
    {
        return in_array($this->attributes['status'], ['CEASED', 'REJECT', 'WITHDR', 'NOTAPP']);
    }

    public function isCeased()
    {
        return $this->attributes['status'] === 'CEASED';
    }

    /*--------------------------- Relationships -----------------------------------*/

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function child()
    {
        return $this->belongsTo(Child::class, 'child_id')->withTrashed();
    }

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_id')->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function entitlements()
    {
        return $this->hasMany(CCSEntitlement::class, 'enrolment_id');
    }
}
