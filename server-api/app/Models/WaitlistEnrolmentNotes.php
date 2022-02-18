<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class WaitlistEnrolmentNotes extends Model
{
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_waitlist_enrolment_notes';

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
        'type',
        'enquiry_waitlist_enrolment_id',
        'child_id',
        'note',
        'created_by'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
    ];

    /**
     * encrypt primary id
     * @param $value
     * @return string
     */
    public function getIndexAttribute()
    {
        return ($this->attributes['id'] != null) ? \Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function getWaitEnrolIndexAttribute()
    {
        return ($this->attributes['enquiry_waitlist_enrolment_id'] != null) ? \Helpers::hxCode($this->attributes['enquiry_waitlist_enrolment_id']) : $this->attributes['enquiry_waitlist_enrolment_id'];
    }

    public function waitlistOrEnrolment()
    {
        return $this->belongsTo(WaitListEnrollment::class)->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by')->withTrashed();
    }

}
