<?php

namespace Kinderm8;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;
use Kinderm8\Enums\RoleType;
use Laravel\Passport\HasApiTokens;
use RoleHelpers;
use Spatie\Permission\Traits\HasPermissions;
use Spatie\Permission\Traits\HasRoles;
use Watson\Rememberable\Rememberable;
use Carbon\Carbon;

class User extends Authenticatable
{
    use HasApiTokens,
        Notifiable,
        Rememberable,
        SoftDeletes,
        HasRoles;

    protected $guard_name = 'api';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'km8_users';

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
        'site_manager',
        'first_name',
        'last_name',
        'email',
        'dob',
        'password',
        'phone',
        'phone2',
        'address_1',
        'address_2',
        'zip-code',
        'city',
        'state',
        'country_code',
        'image',
        'second_email',
        'need_sec_email',
        'status',
        'login_access',
        'remember_token',
        'email_verified',
        'ccs_id',
        'primary_contact',
        'pincode',
        'kiosk_setup',
        'invitation_date',
        'deleted_at'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified' => 'boolean',
        'kiosk_setup' => 'array',
        'attendance' => 'array'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password',
        'remember_token',
        'id'
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'index',
        'full_name',
        'role_ids',
        'org_id',
        'org_branch_id',
        'user_type',
        'role_types',
        'full_name',
        'timezone',
        'country',
        'roleGroup',
        'avatar'
    ];

    /**
     * The relations to eager load on every query.
     *
     * @var array
     */
    protected $with = [
        'organization',
        'branch',
        'roles'
    ];

    /*---------------------------- Accessor ----------------------------*/

    /**
     * encrypt primary id
     * @return string
     */
    public function getIndexAttribute()
    {
        return (!is_null($this->attributes['id'])) ? Helpers::hxCode($this->attributes['id']) : $this->attributes['id'];
    }

    public function getFullNameAttribute()
    {
        return rtrim($this->attributes['first_name'] . ' ' . $this->attributes['last_name']);
    }

    public function getRoleIdsAttribute()
    {
        return $this->roles->pluck('id')->map(function ($value)
        {
            return Helpers::hxCode($value);
        });
    }

    public function getOrgIdAttribute()
    {
        return (!is_null($this->attributes['organization_id'])) ? $this->organization->index : '';
    }

    public function getOrgBranchIdAttribute()
    {
        if ($this->isOwner())
        {
            return [];
        }
        else
        {
            return ($this->branch != null) ? $this->branch->index : '';
        }
    }

    public function getUserTypeAttribute()
    {
        $array = [];

        foreach ($this->roles->pluck('name', 'color_code') as $key => $value)
        {
            array_push($array, [
                'color' => $key,
                'name' => $value
            ]);
        }
        return $array;
    }

    public function getRoleTypesAttribute()
    {
        $array = [];

        foreach ($this->roles as $value)
        {
            array_push($array, [
                'index' => $value->index,
                'color' => $value->color_code,
                'name' => $value->name,
                'text' => $value->display_name
            ]);
        }

        return $array;
    }

    public function getRoleGroupAttribute()
    {
        $rolesTypes = $this->roles->pluck('type')->toArray();

        return RoleHelpers::getGroup($rolesTypes);
    }

    public function getTimezoneAttribute()
    {
        $_timezone = 'UTC';

        if (!is_null($this->attributes['organization_id']))
        {
            if (!is_null($this->branch))
            {
                $_timezone = $this->branch->timezone;
            }
            else
            {
                $_timezone = $this->organization->timezone;
            }
        }

        return $_timezone;
    }

    public function getCountryAttribute()
    {
        $_country = 'au';

        if (!is_null($this->attributes['organization_id']))
        {
            $_country = strtolower($this->organization->country_code);
        }

        return $_country;
    }

    public function getAvatarAttribute()
    {
        //return \MediaHelper::getMediaModelAttribute($this->attributes['image']);
        return null;
    }

    /*---------------------------- Mutators ----------------------------*/

    public function setSiteManagerAttribute($value)
    {
        $this->attributes['site_manager'] = $value;
    }

    /*---------------------------- Scopes ------------------------------*/

    public function scopeStaff($query)
    {
        return $query->whereHas('roles', function ($query)
        {
            $query->where('type', RoleType::ADMINPORTAL);
        });
    }

    public function scopePortalAdmin($query)
    {
        return $query->whereHas('roles', function ($query)
        {
            $query->where('type', RoleType::SUPERADMIN);
        });
    }

    public function scopeParent($query)
    {
        return $query->whereHas('roles', function($query)
        {
            $query->where('type', RoleType::PARENTSPORTAL)
                ->where('name', 'parent');
        });
    }

    public function scopeActive($query)
    {
        return $query->where('status', '=', '0');
    }

    /*---------------------------- Functions ------------------------------*/

    /**
     *  Find the user instance for the given email.
     *
     * @param $reference
     * @return mixed
     */
    public function findForPassport($reference)
    {
        return $this->where('id', $reference)->first();
    }

    /**
     * Validate the password of the user for the Passport password grant.
     *
     * @param string $password
     * @return bool
     */
    public function validateForPassportPasswordGrant(string $password)
    {
        return Hash::check($password, $this->password);
    }

    public function isActive()
    {
        return $this->status === '0';
    }

    public function hasLoginAccess()
    {
        return $this->login_access === '0';
    }

    /**
     * has only site manager access (role)
     * @return bool
     */
    public function hasSiteManagerAccess()
    {
        return is_null($this->branch_id) && $this->site_manager === '1';
    }

    public function hasPermissions()
    {
        return $this->getAllPermissions()->count() > 0;
    }

    public function isExpired()
    {
        return $this->invitation_date ? Carbon::now()->gte(Carbon::parse($this->invitation_date)) : false;
    }

    /*--------- Permission check --------------*/

    public function userHasAnyRoles()
    {
        return $this->roles->count() > 0;
    }

    public function isRoot()
    {
        return is_null($this->organization_id)
            && is_null($this->branch_id)
            && $this->roles->filter(function ($value) { return $value->type === RoleType::SUPERADMIN; })->count() === 1;
    }

    public function isOwner()
    {
        return $this->site_manager === '0'
            && $this->roles->filter(function ($value) { return $value->type === RoleType::ORGADMIN; })->count() > 0;
    }

    public function isParent()
    {
        return $this->roles->filter(function ($value) { return $value->type === RoleType::PARENTSPORTAL; })->count() > 0;
    }

    public function isEmergencyContact()
    {
        return $this->roles->filter(function ($value) { return $value->name === 'emergency-contact'; })->count() > 0;
    }

    public function isNotAParent(): bool
    {
        return $this->roles->filter(function ($value) {return $value->name === 'parent';})->count() == 0;
    }

    public function isAdministrative()
    {
        return $this->roles->filter(function ($value) { return $value->type === RoleType::ADMINPORTAL; })->count() > 0;
    }

    public function hasAdminRights()
    {
        return $this->roles->filter(function ($value) { return $value->is_admin === '1'; })->count() > 0;
    }

    public function hasOwnerAccess()
    {
        return $this->isOwner() || $this->hasSiteManagerAccess();
    }

    public function isBranchUser()
    {
        return $this->isAdministrative() || $this->isParent();
    }

    public function isAdminOrOwner()
    {
        return $this->hasAdminRights() || $this->hasOwnerAccess();
    }

    public function getRoleTypeForKinderConnect(): string
    {
        if ($this->isAdministrative() || $this->hasOwnerAccess())
        {
            $type = ($this->hasAdminRights() || $this->hasOwnerAccess()) ? 'administrator' : 'staff';
        }
        else if ($this->isParent())
        {
            $type = 'parent';
        }
        else
        {
            $type = 'unknown';
        }

        return $type;
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

    public function notifications()
    {
        return $this->morphMany(CustomNotification::class, 'notifiable')->orderBy('created_at', 'desc');
    }

    public function rooms()
    {
        return $this->belongsToMany(Room::class,'km8_room_to_user');
    }

    public function parents()
    {
        return $this->belongsToMany(Child::class, 'km8_child_to_user');
    }

    public function child()
    {
        return $this->belongsToMany(Child::class, 'km8_child_to_user')->withPivot('primary_payer')->orderBy('first_name', 'asc');
    }

    public function transactions()
    {
        return $this->hasMany(ParentPaymentTransaction::class, 'parent_id');
    }

    public function paymentSchedules()
    {
        return $this->hasMany(ParentPaymentSchedule::class, 'user_id');
    }

    public function parentPaymentMethods()
    {
        return $this->hasMany(ParentPaymentMethod::class, 'user_id');
    }

    public function parentPayments()
    {
        return $this->hasMany(ParentPayment::class, 'user_id');
    }

    public function bond()
    {
        return $this->hasMany(BondPayment::class, 'user_id');
    }

    public function emergencyChildren()
    {
        return $this->belongsToMany(Child::class, 'km8_child_emergency_contacts', 'user_id', 'child_profile_id')
            ->using('Kinderm8\ChildEmergencyContact')
            ->withPivot('relationship', 'consents', 'types')
            ->withTimestamps();
    }

    public function email_type(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(EmailTypes::class, 'km8_email_types_to_user', 'user_id', 'email_type_id')->withPivot('status')->withTimestamps();
    }
}
