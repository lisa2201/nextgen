<?php

namespace Kinderm8;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class ChildDocuments extends Model
{
    //
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var
     */
    protected $table = 'km8_child_documents';

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
        'documents',
        'child_profile_image',
        'child_id'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'documents' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['index'];

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


    /*--------------------------- Relationships -----------------------------------*/

    public function child()
    {
        return $this->belongsTo(Child::class, 'child_id')->withTrashed();
    }
}
