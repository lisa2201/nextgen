<?php

namespace Kinderm8\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Helpers;
use Carbon\Carbon;
use Kinderm8\Branch;

class Enquiries extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_enquiries';

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
        'enquiry_info',
        'status'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'enquiry_info' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index', 'number_of_days'];

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

    public function getBranchIndexAttribute()
    {
        return ($this->attributes['branch_id'] != null) ? Helpers::hxCode($this->attributes['branch_id']) : $this->attributes['branch_id'];
    }

    public function getOrganizationIndexAttribute()
    {
        return ($this->attributes['organization_id'] != null) ? Helpers::hxCode($this->attributes['organization_id']) : $this->attributes['organization_id'];
    }

    public function getNumberOfDaysAttribute()
    {
        $dt = Carbon::parse($this->attributes['created_at']);

        return $dt->startOfDay()->diffInDays();
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

}
