<?php

namespace Kinderm8\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Kinderm8\Branch;
use Kinderm8\Organization;

class WaitlistEnrolmentQuestions extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_waitlist_enrolment_questions';

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
        'section_id',
        'question',
        'input_type',
        'input_name',
        'required',
        'column_width',
        'column_height',
        'column_order',
        'hidden',
        'status',
        'access_for',
        'input_placeholder',
        'input_mandatory',
        'input_mandatory_changeable',
        'input_hiddenfield_name',
        'input_placeholder_name',
        'input_required',
        'types',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'question' => 'array',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [];
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

    public function getTypesAttribute()
    {
        return ($this->attributes['types'] != null) ? json_decode($this->attributes['types']) : '';
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function section()
    {
        return $this->belongsTo(WaitlistEnrolmentSections::class)->withTrashed();
    }
}
