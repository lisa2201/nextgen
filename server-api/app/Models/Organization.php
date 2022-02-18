<?php

namespace Kinderm8;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class Organization extends Model
{
    use SoftDeletes;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_organization';

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'deleted_at',
        'subscription_start_date',
        'trial_end_date',
        'grace_period_end_date'
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'plan_id',
        'company_name',
        'timezone',
        'email',
        'phone_number',
        'fax_number',
        'address_1',
        'address_2',
        'zip_code',
        'city',
        'country_code',
        'howdidyouhear',
        'price',
        'status',
        'payment_status',
        'grace_period',
        'grace_period_end_date',
        'subscription_start_date',
        'trial_end_date',
        'email_verified',
        'preferences'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified' => 'boolean'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['id', 'pivot'];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'subscription_expired'
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

    /**
     * check if subscription expired for standard or organization plan
     * @return array
     */
    public function getSubscriptionExpiredAttribute()
    {
        // try
        // {
        //     if($this->current_plan->name != config('subscripton.plans.P1'))
        //     {
        //         $startTime = Carbon::parse($this->attributes['subscription_start_date']);
        //         $finishTime = Carbon::parse($this->attributes['trial_end_date']);
        //         $expired = [
        //             'status' => ($finishTime->diffInDays($startTime) < 1) ? true : false,
        //             'count' => ($finishTime->diffInDays($startTime) < 1) ? 0 : $finishTime->diffInDays($startTime)
        //         ];
        //     }
        //     else
        //     {
        //         $expired = null;
        //     }
        // }
        // catch(Exception $e)
        // {
        //     $expired = [ 'status' => true ];
        //     ErrorHandler::log($e);
        // }

        return null;// $expired;
    }

    /*---------------------------- Mutators ----------------------------*/


    /*---------------------------- Scopes ------------------------------*/


    /*---------------------------- Functions ------------------------------*/

    /**
     * Check if grace date is passed.
     *
     * @return bool
     */
    public function isGracePeriodExpired()
    {
        return ($this->grace_period_end_date != null) ? Carbon::now()->gte(Carbon::parse($this->grace_period_end_date)) : false;
    }

    /**
     * get available grace period (days)
     *
     * @return integer
     */
    public function getAvailableGracePeriod()
    {
        return ($this->grace_period_end_date != null) ? (Carbon::parse($this->grace_period_end_date)->dayOfYear - Carbon::now()->dayOfYear) : 0;
    }

    /*--------------------------- Relationships -----------------------------------*/

    public function user()
    {
        return $this->hasOne(User::class)->whereNull('branch_id');
    }

    public function users()
    {
        return $this->hasMany(User::class)->withTrashed();
    }

    public function branch()
    {
        return $this->hasMany(Branch::class)->withTrashed();
    }

    public function current_plan()
    {
        return $this->belongsTo(SubscriptionPlans::class, 'plan_id', 'id');
    }

    public function payment_data()
    {
        return $this->hasMany(PaymentInformations::class)->where('status', '0');
    }

    public function cards()
    {
        return $this->hasMany(CreditCard::class)->withTrashed();
    }

    public function user_owners()
    {
        return $this->hasMany(User::class)->where('site_manager','1')->withTrashed();
    }

    public function subscriptions()
    {
        return $this->hasMany(OrganizationSubscription::class)->withTrashed();
    }

    public function ccs_info()
    {
        return $this->hasMany(CcsSetup::class)->withTrashed();
    }
}
