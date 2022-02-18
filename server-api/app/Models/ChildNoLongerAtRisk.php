<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class ChildNoLongerAtRisk extends Model
{
    use Notifiable;
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_child_accs_no_longer_at_risk';

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
        'accs_id',
        'supporting_docs',
        'is_synced',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'supporting_docs' => 'array',
        'api_data' => 'array',
        'syncerror' => 'array',
    ];

    /*--------------------------- Relationships -----------------------------------*/

    public function getACCS()
    {
        return $this->belongsTo('Kinderm8\ACCS')->withTrashed();
    }


}
