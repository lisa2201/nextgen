<?php

namespace Kinderm8;

use Carbon\Carbon;
use CCSHelpers;
use DateTimeHelper;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Kinderm8\Enums\CCSType;
use Staudenmeir\EloquentEagerLimit\HasEagerLimit;

class Child extends Model
{
    use Notifiable;
    use SoftDeletes;
    use HasEagerLimit;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_profile';

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
        'first_name',
        'middle_name',
        'last_name',
        'legal_first_name',
        'legal_last_name',
        'gender',
        'child_description',
        'dob',
        'attendance',
        'join_date',
        'home_address',
        'suburb',
        'state',
        'postalcode',
        'court_orders',
        'nappy_option_required',
        'bottle_feed_option_required',
        'ccs_id',
        'child_profile_image'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'attendance' => 'array'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'id',
        'pivot'
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'full_name',
        'avatar'
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

    public function getFullNameAttribute()
    {
        return trim($this->attributes['first_name'] . ' ' . (!Helpers::IsNullOrEmpty($this->attributes['middle_name']) ? '' . $this->attributes['middle_name'] : ' ').' '.$this->attributes['last_name']);
    }

    public function getAvatarAttribute()
    {
        //return \MediaHelper::getMediaModelAttribute($this->attributes['media_avatar_id']);
        return '';
    }

    function getAgeAttribute()
    {
        /*return DateTimeHelper::getTimezoneDatetime($this->dob, auth()->user()->timezone)
            ->diff(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone))
            ->format('%y years, %m months and %d days');*/

        return Carbon::parse($this->dob)
            ->diff(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone))
            ->format('%y years, %m months and %d days');
    }

    function getAgeMonthsAttribute()
    {
        /*return DateTimeHelper::getTimezoneDatetime($this->dob, auth()->user()->timezone)
            ->diff(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone))
            ->format('%y years, %m months and %d days');*/

        return Carbon::parse($this->dob)->floatDiffInMonths(DateTimeHelper::getTimezoneDatetime(Carbon::now(), auth()->user()->timezone));
    }

    /*---------------------------- Mutators ----------------------------*/

    /*---------------------------- Scopes ------------------------------*/

    public function scopeActive($query)
    {
        return $query->where('status', '=', '1');
    }

    /*---------------------------- Functions ------------------------------*/

    public function primaryPayer()
    {
        return $this->parents()->wherePivot('primary_payer', '=', true)->first()
            ? $this->parents()->wherePivot('primary_payer', '=', true)->first()
            : null;
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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function rooms()
    {
        return $this->belongsToMany(Room::class, 'km8_child_to_rooms')->withTrashed();
    }

    public function parents()
    {
        return $this->belongsToMany(User::class, 'km8_child_to_user')->withTimestamps()->withPivot('primary_payer');
    }

    public function ccs_enrolment()
    {
        return $this->hasMany(CCSEnrolment::class, 'child_id')->latest()->limit(5);
    }

    public function active_ccs_enrolment()
    {
        return $this->hasMany(CCSEnrolment::class, 'child_id')->where('status', 'CONFIR')->latest()->limit(1);
    }

    public function session_ccs_enrolment()
    {
        return $this->hasMany(CCSEnrolment::class, 'child_id')
            ->whereIn('status', CCSHelpers::getValidEnrolmentStatusForSubmission())
            ->latest()
            ->limit(1);
    }

    public function emergency()
    {
        return $this->hasMany(ChildEmergencyContact::class, 'child_profile_id');
    }

    public function emergencyContacts()
    {
        return $this->belongsToMany(User::class, 'km8_child_emergency_contacts', 'child_profile_id', 'user_id')
            ->using('Kinderm8\ChildEmergencyContact')
            ->withPivot('relationship', 'consents', 'types', 'call_order')
            ->withTimestamps();
    }

    public function allergy()
    {
        return $this->hasMany(Allergy::class, 'child_id');
    }

    public function health_medical()
    {
        return $this->hasOne(HealthAndMedical::class, 'child_id')->withTrashed();
    }

    public function cultural_details()
    {
        return $this->hasOne(ChildCulturalDetails::class, 'child_id')->withTrashed();
    }

    public function documents()
    {
        return $this->hasOne(ChildDocuments::class, 'child_id')->withTrashed();
    }

    public function notes()
    {
        return $this->hasMany(WaitlistEnrolmentNotes::class, 'child_id')->orderBy('updated_at', 'DESC');
    }

    public function school_bus()
    {
        return $this->hasMany(ChildSchoolBus::class, 'child_id');
    }

    public function school()
    {
        return $this->hasOne(School::class, 'km8_child_school_bus');
    }

    public function bus()
    {
        return $this->hasMany(Bus::class, 'km8_child_school_bus');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'child_id');
    }

    public function bookings_current_week()
    {
        return $this->hasMany(Booking::class, 'child_id')->whereBetween('date', [
            Carbon::now(auth()->user()->timezone)->startOfWeek()->format('Y-m-d'),
            Carbon::now(auth()->user()->timezone)->endOfWeek()->format('Y-m-d')
        ]);
    }

    public function consents()
    {
        return $this->hasMany(ChildConsents::class, 'child_id');
    }
}
