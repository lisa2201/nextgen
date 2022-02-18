<?php

namespace Kinderm8;

use Illuminate\Database\Eloquent\Model;

class Sample4 extends Model
{
    //Sapmle4

    protected $guard_name = 'api';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bridgestkidsbexleyemergency';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    // protected $dates = ['deleted_at'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    // protected $casts = [
    //     'data' => 'array'
    // ];

    protected $fillable = [
        "Child First Name",
        "Child Last Name",
        "Immunisations",
        "Child Health Medical Info",
        "Child Dob",
        "Child Anaphylaxis",
        "Child Asthma",
        "Child Crn",
        "Child Doctor",
        "Child Facsia",
        "Child Allergy",
        "Child Ccs Percentage",
        "Absences Ccs",
        "Child Schedule",
        "Child Emergency Contacts",
        "Child Schedule Hours",
        "Enrolment Start",
        "Family",
        "Enrolment End",
        "Child Family Status",
        "Indigenous Status",
        "Status",
        "Arrangement Type",
        "Place Of Birth",
        "Fortnightly Hours",
        "ACCS Eligibility",
        "Room Allocation",
        "Parent 1 First Name",
        "Parent 1 Last Name",
        "Parent 1 Mobile",
        "Parent 1 Dob",
        "Parent 1 Home Phone",
        "Parent 1 Crn",
        "Parent 1 Work Phone",
        "Parent 1 Address",
        "Parent 1 Email",
        "Parent 2 First Name",
        "Parent 2 Last Name",
        "Parent 2 Mobile",
        "Parent 2 Dob",
        "Parent 2 Home Phone",
        "Parent 2 Crn",
        "Parent 2 Work Phone",
        "Parent 2 Address",
        "Parent 2 Email"
    ];


    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    // protected $hidden = [
    //     'id'
    // ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    // protected $appends = [
    //     'index',
    // ];

    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @param $value
     * @return string
     */
    // public function getIndexAttribute()
    // {
    //     return (!is_null($this->attributes['id'])) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    // }

    // public function branch()
    // {
    //     return $this->belongsTo('Kinderm8\Branch')->withTrashed();
    // }
}
