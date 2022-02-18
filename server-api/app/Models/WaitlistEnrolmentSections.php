<?php

namespace Kinderm8\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Kinderm8\Organization;
use Helpers;
use Kinderm8\WaitlistEnquiryQuestions;

class WaitlistEnrolmentSections extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_waitlist_enrolment_sections';

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
        'section_name',
        'mandatory',
        'section_position_static',
        'section_order',
        'hide_status',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
//    protected $casts = [
//        'form_inputs' => 'array',
//    ];


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

    public function questions_waitlist()
    {
        return $this->hasMany(WaitlistQuestions::class, 'section_id');
    }

    public function questions_enrolment()
    {
        return $this->hasMany(WaitlistEnrolmentQuestions::class, 'section_id');
    }

    public function questions_enquiry()
    {
        return $this->hasMany(WaitlistEnquiryQuestions::class, 'section_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function scopeNotHidden($query)
    {
        return $query->where('hide_status', '=', 1);
    }
}
