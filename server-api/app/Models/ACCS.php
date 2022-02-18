<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class ACCS extends Model
{
    use Notifiable;
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_accs';

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
        'child_profile_id',
        'type',
        'certificate_or_determination_api_data',
        'state_territory_data',
        'is_synced',
        'syncerror',
        'dhscorrelationid',
        'cancel_reason'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'certificate_or_determination_api_data' => 'array',
        'state_territory_data' => 'array',
        'syncerror' => 'array',
        'response' => 'array'
    ];

    public function getchild()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }

    public function getChildNoLongerAtRisk()
    {
        return $this->hasOne(ChildNoLongerAtRisk::class,'accs_id')->withTrashed();
    }
}
