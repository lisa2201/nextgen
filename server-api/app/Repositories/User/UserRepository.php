<?php

namespace Kinderm8\Repositories\User;

use Arr;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use DateTimeHelper;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;

class UserRepository implements IUserRepository
{
    use UserAccessibility;

    private $sortColumnsMap = [
        'name' => 'km8_users.first_name',
        'email' => 'km8_users.email',
        'status' => 'km8_users.email',
        'login' => 'km8_users.login_access',
        'branch' => 'km8_organization_branch.name',
        'level' => 'km8_roles.type'
    ];

    private $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->user, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @param bool $throwable
     * @return Builder|Builder[]|Collection|User|mixed
     * @throws ResourceNotFoundException
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $throwable)
    {
        $users = $this->user
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            });

        // access
        $users = $this->attachAccessibilityQuery($users);

        if (is_array($args) && !empty($args))
        {
            $users
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['reference']), function ($query) use ($args)
                {
                    return (is_array($args['reference'])) ? $query->whereIn('id', $args['reference']) : $query->where('id', $args['reference']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $users->orderBy('first_name', 'asc');
        }

        $users = $users->get();

        if ($throwable && $users->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $users;
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function list($args, Request $request)
    {
        $actualCount = 0;
        $filters = null;
        $viewParent = null;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $user_list = $this->user
                ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_users.branch_id')
                ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
                ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id');

            //remove current user
            //$user_list->where('km8_users.email', '<>', auth()->user()->email);

            //access
            $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

            if(auth()->user()->isAdministrative())
            {
                $viewParent = (! Helpers::IsNullOrEmpty($request->input('view-parent')))
                    ? (($request->input('view-parent') === '1') ? RoleType::PARENTSPORTAL : RoleType::ADMINPORTAL)
                    : null;

                if(!is_null($viewParent))
                {
                    $user_list
                        ->with(['child'])
                        ->where('km8_roles.type', 'ILIKE', '%'. $viewParent .'%');

                    if ($viewParent == RoleType::PARENTSPORTAL && !Helpers::IsNullOrEmpty($request->input('parents-only')))
                    {
                        $user_list->where('km8_roles.name', '=', 'parent');
                    }

                }
            }

            //get actual count
            $actualCount = $user_list
                ->select(['km8_users.*', 'km8_organization_branch.name', 'km8_roles.type'])
                ->groupBy('km8_users.id', 'km8_roles.type', 'km8_organization_branch.name')
                ->get()
                ->count();

            //filters
            if(!is_null($filters))
            {
                if(isset($filters->status) && $filters->status !== '')
                {
                    $user_list->where('km8_users.status', '=', $filters->status === '1' ? '0' : '1');
                }

                if(isset($filters->has_access) && $filters->has_access !== '0')
                {
                    $user_list->where('km8_users.login_access', '=', $filters->has_access === '1' ? '0' : '1');
                }

                if(isset($filters->level) && $filters->level !== '0')
                {
                    $user_list->where('km8_roles.type', 'ILIKE', '%'.$filters->level.'%');
                }

                if(isset($filters->role) && $filters->role !== '0')
                {
                    $user_list->where('km8_roles.id', 'ILIKE', '%'.Helpers::decodeHashedID($filters->role).'%');
                }

                if(isset($filters->branch) && !is_null($filters->branch))
                {
                    $user_list->where('km8_users.branch_id', Helpers::decodeHashedID($filters->branch));
                }

                if(isset($filters->room) && !is_null($filters->room))
                {
                    $room_id = Helpers::decodeHashedID($filters->room);

                    if(! Helpers::IsNullOrEmpty($request->input('view-parent')))
                    {

                        if(($request->input('view-parent') === '1')){

                            $user_list->whereHas('child', function($query) use ($room_id)
                            {
                                $query->whereHas('rooms', function($query) use ($room_id)
                                {
                                    $query->where('room_id', $room_id);
                                });
                            });

                        }else{

                            $user_list->whereHas('rooms', function($query) use ($room_id)
                            {
                                $query->where('room_id', $room_id);
                            });

                        }
                    }

                }

            }
            else
            {
                $user_list->where('km8_users.status', '=', '0');
            }

            //search
            if(!is_null($searchValue))
            {
                $searchList = [];

                if(auth()->user()->isRoot())
                {
                    // to-do
                }
                else if(auth()->user()->hasOwnerAccess())
                {
                    $searchList = [
                        'km8_users.first_name',
                        'km8_users.last_name',
                        'km8_users.email',
                        'km8_organization_branch.name'
                    ];
                }
                else
                {
                    $searchList = [
                        'km8_users.first_name',
                        'km8_users.last_name',
                        'km8_users.email',
                    ];
                }

                if(!empty($searchList))
                {
                    $user_list->whereLike($searchList, $searchValue);
                }
            }

            //sorting
            if(!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            {
                $user_list->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            }
            else
            {
                $user_list->orderBy('km8_users.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $user_list = $user_list
                ->select(['km8_users.*', 'km8_organization_branch.name', 'km8_roles.type'])
                ->groupBy('km8_users.id', 'km8_roles.type', 'km8_organization_branch.name')
                ->paginate($offset);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $user_list = [];
        }

        return [
            'list' => $user_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param Request $request
     * @param string $role_model
     * @return mixed
     * @throws BindingResolutionException
     */
    public function store(Request $request, string $role_model)
    {
        $branch_id = ($request->input('branch') != '') ? Helpers::decodeHashedID($request->input('branch')) : auth()->user()->branch_id;
        $org_id = ($request->input('org') != '') ? Helpers::decodeHashedID($request->input('org')) : auth()->user()->organization_id;

        // create user profile
        $userAcc = new $this->user;

        //set organization
        if(auth()->user()->isRoot())
        {
            $userAcc->organization_id = $org_id;
            $userAcc->branch_id = $branch_id;
        }
        elseif (auth()->user()->hasOwnerAccess())
        {
            $userAcc->organization_id = auth()->user()->organization_id;
            $userAcc->branch_id = $branch_id;
        }
        else
        {
            $userAcc->organization_id = auth()->user()->organization_id;
            $userAcc->branch_id = auth()->user()->branch_id;
        }

        $userAcc->email = $request->input('email');
        $userAcc->first_name = ($request->input('firstname') != '') ? $request->input('firstname') : null;
        $userAcc->last_name = ($request->input('lastname') != '') ? $request->input('lastname') : null;
        $userAcc->password = bcrypt($request->input('password'));
        $userAcc->dob = ($request->input('dob') != '') ? $request->input('dob') : null;

        $secEmail = ($request->input('needsec_email') != '') ? filter_var($request->input('needsec_email'), FILTER_VALIDATE_BOOLEAN) : false;
        if($secEmail && $request->input('secondaryemail') != '')
        {
            $userAcc->second_email =  $request->input('secondaryemail');
            $userAcc->need_sec_email = '1';
        }

        $userAcc->phone = ($request->input('phone') != '') ? $request->input('phone') : null;
        $userAcc->phone2 = ($request->input('mobile') != '') ? $request->input('mobile') : null;
        $userAcc->address_1 = ($request->input('address1') != '') ? $request->input('address1') : null;
        $userAcc->address_2 = ($request->input('address2') != '') ? $request->input('address2') : null;
        $userAcc->city = ($request->input('city') != '') ? $request->input('city') : null;
        $userAcc->zip_code = ($request->input('zipcode') != '') ? $request->input('zipcode') : null;

        $userAcc->status = ($request->input('status') != '') ? $request->input('status') : '1';
        $userAcc->ccs_id = ($request->input('ccs_id') != '') ? $request->input('ccs_id') : '';
        $userAcc->login_access = (!$request->input('login_access')) ? '1' : '0';

        $userAcc->country_code = ($request->input('country') != '') ? $request->input('country') : '';
        $userAcc->state = ($request->input('state')) ? $request->input('state') : '';

        $userAcc->work_phone = ($request->input('work_phone') != '') ? $request->input('work_phone') : '';
        $userAcc->work_mobile = ($request->input('work_mobile')) ? $request->input('work_mobile') : '';
        $userAcc->attendance = $request->input('attendance')?DateTimeHelper::getDaysInWeek($request->input('attendance')) : [];
        $userAcc->image = ($request->input('image')) ? $request->input('image') : null;

        $userAcc->save();

        //attach roles to user
        $role = app()->make("Kinderm8\\{$role_model}");

        if(in_array($request->input('role_name'), ['parent', 'staff'])) {
            $role = $role->where('organization_id', '=', $org_id);
        }

        $role = $role->where('name', '=', $request->input('role_name'))
            ->get()->first();
        $userAcc->assignRole($role->id);

        return $userAcc;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $user = $this->user->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $user->with($depends);
        }

        $user = $user->first();

        if (is_null($user))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $user;
    }

    /**
     * @param $id
     * @param array $args
     * @param array $depends
     * @return Collection
     * @throws ResourceNotFoundException
     */
    public function findByBranch($id, array $args, array $depends)
    {
        $user = $this->user->where('branch_id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $user->with($depends);
        }

        if (is_array($args) && !empty($args))
        {
            $user
                ->when(isset($args['user']), function ($query) use ($args)
                {
                    return $query->where('id', $args['user']);
                });
        }

        $user = $user->get();

        if ($user->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $user;
    }

    /**
     * @param Request $request
     * @param string $email
     * @return Builder[]|Collection
     */
    public function findByEmail(Request $request, string $email)
    {
        //$value = rtrim($request->input('value'));
        $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;

        $query = $this->user->where('email', '=', $email);

        $query = $this->attachAccessibilityQuery($query, ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('org_id')) : null);

        //ignore this data
        if ($index != null)
        {
            $query->where('id', '!=', $index);
        }

        return $query->get();
    }

    /**
     * @param $org_id
     * @param $user_id
     * @param string $email
     * @param array $args
     * @param array $depends
     * @param bool $withTrashed
     * @param bool $throwable
     * @return Collection
     * @throws ResourceNotFoundException
     */
    public function findBranchUserBySubscriber($org_id, $user_id, string $email, array $args, array $depends, bool $withTrashed, bool $throwable)
    {
        $users = $this->user
            ->where('id', '<>', $user_id)
            ->where('organization_id', $org_id)
            ->where('email', $email);

        // attach relationship data
        if(!empty($depends))
        {
            $users->with($depends);
        }

        $users->when($withTrashed, function ($query)
        {
            return $query->withTrashed();
        });

        if (is_array($args) && !empty($args))
        {
            // relation filter mapping
            if (isset($args['relation_filter']) && is_array($args['relation_filter']) && !empty($args['relation_filter']))
            {
                foreach ($args['relation_filter'] as $key => $query_item)
                {
                    $users->whereHas($key, function($query) use ($query_item)
                    {
                        foreach ($query_item as $item)
                        {
                            $query->where($item['column'], $item['value']);
                        }

                        return $query;
                    });
                }
            }
        }

        $users = $users->get();

        if ($throwable && $users->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $users;
    }

    /**
     * @param $phone
     * @return mixed
     */
    public function findByMobile($phone)
    {
        $user = $this->user
            ->where('branch_id', '=', RequestHelper::getBranchId())
            ->where('phone', '=', $phone)
            ->first();

        return $user;
    }

    /**
     * @param $id
     * @param array $depends
     * @return Builder|Model|\Illuminate\Database\Query\Builder|User|object|null
     * @throws ResourceNotFoundException
     */
    public function findSubscriber($id, array $depends)
    {
        $user = $this->user
            ->where('organization_id', $id)
            ->whereNull('branch_id');

        // attach relationship data
        if(!empty($depends))
        {
            $user->with($depends);
        }

        $user = $user->first();

        if (is_null($user))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $user;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request)
    {

        $userAcc = $this->findById($id, ['branch']);

        $userAcc->first_name = ($request->input('firstname') != '') ? $request->input('firstname') : null;
        $userAcc->last_name = ($request->input('lastname') != '') ? $request->input('lastname') : null;
        $userAcc->dob = ($request->input('dob') != '') ? $request->input('dob') : null;
        $userAcc->email = $request->input('email');
        $userAcc->second_email = ($request->input('second_email') != '') ? $request->input('second_email') : null;
        $userAcc->phone = ($request->input('phone') != '') ? $request->input('phone') : null; // mobile
        $userAcc->phone2 = ($request->input('mobile') != '') ? $request->input('mobile') : null; // phone
        $userAcc->address_1 = ($request->input('address1') != '') ? $request->input('address1') : null;
        $userAcc->address_2 = ($request->input('address2') != '') ? $request->input('address2') : null;
        $userAcc->city = ($request->input('city') != '') ? $request->input('city') : null;
        $userAcc->zip_code = ($request->input('zipcode') != '') ? $request->input('zipcode') : null;
        $userAcc->country_code = ($request->input('country') != '') ? $request->input('country') : '';
        $userAcc->state = ($request->input('state')) ? $request->input('state') : '';
        $userAcc->attendance = ($request->input('attendance'))? DateTimeHelper::getDaysInWeek($request->input('attendance')): null;

        if($request->route()->getName() != 'device-update-profile'){
            //except parent api route

            $secEmail = ($request->input('copy_to_sub_mail') != '') ? filter_var($request->input('copy_to_sub_mail'), FILTER_VALIDATE_BOOLEAN) : false;
            if($secEmail && $request->input('second_email') != '')
            {
                $userAcc->need_sec_email = '1';
            }else{
                $userAcc->need_sec_email = '0';
            }

            $userAcc->ccs_id = ($request->input('ccs_id') != '') ? $request->input('ccs_id') : null;
            $userAcc->pincode = ($request->input('pincode') != '') ? $request->input('pincode') : null;
            $userAcc->status = (!$request->input('status')) ? '1' : '0';
            $userAcc->work_phone = ($request->input('work_phone') != '') ? $request->input('work_phone') : '';
            $userAcc->work_mobile = ($request->input('work_mobile')) ? $request->input('work_mobile') : '';

            if($request->route()->getName() != 'device-update-user'){

                $userAcc->login_access = (!$request->input('login_access')) ? '1' : '0';

                //kiosk setup
                $kiosk = [
                    'qualification_level' => ($request->input('qualification_level') != '') ? $request->input('qualification_level') : null,
                    'qualification' => ($request->input('qualification') != '') ? $request->input('qualification') : null,
                    'medical_qualification' => ($request->input('medical_qualification') != '') ? $request->input('medical_qualification') : null,
                    'registered_position' => ($request->input('registered_position') != '') ? $request->input('registered_position') : null,
                    'resposible_person_order' => ($request->input('resposible_person_order') != '') ? $request->input('resposible_person_order') : null,
                    'working_hours' => ($request->input('working_hours') != '') ? $request->input('working_hours') : null,
                    'paid_lunch' => ($request->input('paid_lunch') != '') ? $request->input('paid_lunch') : null,
                ];

                $userAcc->kiosk_setup = $kiosk;

                $profilepictureinput = $request->input('upload_file');

                if ($profilepictureinput) {
                    $userAcc->image = $profilepictureinput['staffImage'][0];
                }

            }else{
                //staff api route
                $userAcc->image = $request->input('image');
            }

        }

        $userAcc->save();

        return $userAcc;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateStatus(string $id, Request $request)
    {
        $option = (filter_var($request->input('status'), FILTER_VALIDATE_BOOLEAN)) ? '0' : '1';

        $user = $this->findById($id, []);

        if(!is_null($user) && $user->status != $option)
        {
            $user->status = $option;

            $user->save();
        }

        return $user;
    }

    /**
     * @param string $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $user = $this->findById($id, []);

        // copy for reference
        $clone = $user;

        if ($user->deleted_at != null)
        {
            $user->forceDelete();
        }
        else
        {
            $user->delete();
        }

        return $clone;
    }

    /**
     * @param string $id
     * @param string $value
     * @return bool
     */
    public function setCRN(string $id, string $value)
    {
        $this->user
            ->where('id', $id)
            ->update([ 'ccs_id' => $value ]);

        return true;
    }

    /**
     * @param Request $request
     * @param Model|null $childObj
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function findParentByChild(Request $request, ?Model $childObj, bool $withTrashed)
    {
        $user_list = $this->user
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            ->where('km8_users.status', '=', '0')
            ->whereNotNull('km8_roles.organization_id')
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::PARENTSPORTAL .'%');

        if(!$withTrashed)
        {
            $user_list->whereNull('km8_users.deleted_at');
        }

        //ignore selected users
        if(!is_null($childObj) && !is_null($childObj->parents) && count($childObj->parents) > 0)
        {
            $user_list->whereNotIn('km8_users.id', $childObj->parents->pluck('id'));
        }

        $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

        return $user_list
            ->select(['km8_users.*', 'km8_roles.type'])
            ->groupBy('km8_users.id', 'km8_roles.type')
            ->orderBy('km8_users.first_name','asc')
            ->get();
    }

    /**
     * @param Request $request
     * @param Model|null $childObj
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function findUserForEmergencyContacts(Request $request, ?Model $childObj, bool $withTrashed)
    {
        $user_list = $this->user
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            ->where('km8_users.branch_id', '=', auth()->user()->branch_id)
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::PARENTSPORTAL .'%')
            ->where('km8_users.status', '=', '0');

        if(!$withTrashed)
        {
            $user_list->whereNull('km8_users.deleted_at');
        }

        //ignore selected users
        if(!is_null($childObj) && !is_null($childObj->emergency) && count($childObj->emergency) > 0)
        {
            $user_list->whereNotIn('km8_users.id', $childObj->emergency->pluck('user_id'));
        }

        $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

        return $user_list
            ->select(['km8_users.*'])
            ->orderBy('km8_users.first_name','asc')
            ->get();
    }

    /**
     * @param Request $request
     * @param bool $onlyAdministrator
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function findAdministrativeUsers(Request $request, bool $onlyAdministrator, bool $withTrashed)
    {
        $selected = ($request->input('selected') != '') ? Helpers::decodeHashedID($request->input('selected')) : null;
        $own_room = (!is_null($request->input('own_room')) && $request->input('own_room') == '1') ? true : false;

        $user_list = $this->user
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            ->where('km8_users.status', '=', '0')
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::ADMINPORTAL .'%');

        if (!$withTrashed)
        {
            $user_list->whereNull('km8_users.deleted_at');
        }

        if ($onlyAdministrator)
        {
            $user_list->where('km8_roles.is_admin','1');
        }

        //ignore selected users
        if (!is_null($selected))
        {
            $user_list->whereNotIn('km8_users.id', $selected);
        }

        if($own_room && auth()->user()->getRoleTypeForKinderConnect() == 'staff')
        {
            //only own room users
            $room_staff = [];
            $user_rooms = auth()->user()->rooms;
                
            foreach($user_rooms as $room){
                array_push($room_staff, $room->staff->pluck('id'));
            }

            $user_list->whereIn('km8_users.id', $room_staff);
        }

        // access
        $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

        return $user_list
            ->select(['km8_users.*', 'km8_roles.type'])
            ->groupBy('km8_users.id', 'km8_roles.type')
            ->orderBy('km8_users.first_name','asc')
            ->get();
    }

    /**
     * @param array $args
     * @param Request $request
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function findParentUsers(array $args, Request $request, bool $withTrashed)
    {
        $selected = ($request->input('selected') != '') ? Helpers::decodeHashedID($request->input('selected')) : null;

        $user_list = $this->user
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            // ->where('km8_users.status', '=', '0')
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::PARENTSPORTAL .'%');

        if (!$withTrashed)
        {
            $user_list->whereNull('km8_users.deleted_at');
        }

        //ignore selected users
        if (!is_null($selected))
        {
            $user_list->whereNotIn('km8_users.id', $selected);
        }

        // access
        $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

        if (is_array($args) && !empty($args))
        {
            // only for super admin
            if(auth()->user()->isRoot())
            {
                $user_list
                    ->when(isset($args['org']), function ($query) use ($args)
                    {
                        return $query->where('km8_users.organization_id', $args['org']);
                    });
            }

            if(auth()->user()->isRoot() || auth()->user()->hasOwnerAccess())
            {
                $user_list
                    ->when(isset($args['branch']), function ($query) use ($args)
                    {
                        return $query->where('km8_users.branch_id', $args['branch']);
                    });
            }

            $user_list
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('km8_users.status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy("km8_users.{$args['order']['column']}", $args['order']['value']);
                });
        }
        // default
        else
        {
            $user_list->orderBy('km8_users.first_name','asc');
        }

        return $user_list
            ->select(['km8_users.*', 'km8_roles.type'])
            ->groupBy('km8_users.id', 'km8_roles.type')
            ->get();
    }

    /**
     * @return Builder[]|Collection
     * @throws ResourceNotFoundException
     */
    public function getAllParents()
    {

        $user = $this->user::Parent();
        $user = $this->attachAccessibilityQuery($user, null, 'km8_users');


        if (is_null($user))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $user->where('email_verified', '=', false)->where('status', '=', '0')->where('email', 'not like', "noreply@kinderm8.com.au")->get();
        // $user = $this->user::Parent();
        // $user = $this->attachAccessibilityQuery($user, null, 'km8_users');

        // $user_list = $this->user->with(['organization', 'branch', 'roles'])
        //         ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_users.branch_id')
        //         ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
        //         ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id');

        // //access
        // $user_list = $this->attachAccessibilityQuery($user_list, null, 'km8_users');

        // if (is_null($user_list))
        // {
        //     throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        // }

        // $user_list= $user_list->where('km8_roles.type', 'ILIKE', '%'.RoleType::PARENTSPORTAL.'%')
        //           ->where('km8_roles.name', 'not like', '%emergency-contact%');

        // return $user_list->where('km8_users.email_verified', '=', false)->where('km8_users.status', '=', '0')
        //             ->where('km8_users.email', 'not like', "noreply@kinderm8.com.au")->get();
    }

    /**
     * @param string $id
     * @param string $password
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updatePassword(string $id, string $password)
    {
        $user = $this->findById($id, []);

        if (is_null($user))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $user->password = bcrypt($password);
        $user->login_access = '0';
        $user->email_verified = true;
        $user->invitation_date = null;
        $user->status = '0';

        $user->save();

        return $user;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function resetPassword(string $id, Request $request)
    {
        $user = $this->findById($id, [ 'branch' ]);

        if (is_null($user))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $user->password = bcrypt($request->input('password'));
        $user->login_access = '0';

        if($request->input('verify_email') != null){
            $user->email_verified = true;
        }

        $user->update();

        return $user;
    }

    /**
     * @param $id
     * @return Builder|Model|\Illuminate\Database\Query\Builder|User|object|null
     */
    public function findByIdForPasswordSetup($id)
    {
        $user = $this->user->where('id', $id)->withTrashed();

        $user = $user->first();

        return $user;
    }

    public function getAllActiveParents(Request $request)
    {
        $viewParent = null;

        try
        {
            //query builder
            $user_list = $this->user
                ->parent()
                ->whereHas('child')
                ->with([
                    'child',
                    'bond',
                    'transactions' => function ($query) {
                        $query->orderBy('id', 'desc');
                    }
                ]);

            $user_list = $this->attachAccessibilityQuery($user_list);

            $user_list = $user_list->whereHas('child', function($query) {
                $query->where('primary_payer', '=', true);
            });

            $user_list = $user_list->orderBy('first_name', 'asc')->get();

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $user_list = [];
        }

        return $user_list;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $type
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateRooms(string $id, Request $request, string $type)
    {
        $room_id = Helpers::decodeHashedID($request->input('room'));

        $userObj = $this->findById($id, ['child', 'rooms']);

        if (is_null($userObj) || is_null($userObj))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        ($type === RequestType::ACTION_TYPE_NEW)
            ? $userObj->rooms()->attach($room_id)
            : $userObj->rooms()->detach($room_id);

        $userObj->load(['rooms']);

        return $userObj;
    }

    public function findByBranchStaffAndParent($id, array $args, array $depends)
    {
        $user_list = $this->user
            ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_users.branch_id')
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id');

        $user_list =  $user_list
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::ADMINPORTAL .'%')
            ->orWhere('km8_roles.type', 'ILIKE', '%'. RoleType::PARENTSPORTAL .'%')
            ->Where('km8_roles.name', '=', 'parent');

        // brach filter
        $user_list =  $user_list
            ->where('km8_users.branch_id', '=', $id);

        $user_list = $user_list
            ->select(['km8_users.*', 'km8_organization_branch.name', 'km8_roles.type'])
            ->groupBy('km8_users.id', 'km8_roles.type', 'km8_organization_branch.name');

        return $user_list->get();
    }

    public function generatePin(string $id, Request $request)
    {

        $userAcc = $this->findById($id, ['branch']);

        $pin_code = Helpers::generatePinCode(4, 'User', $userAcc->organization_id);

        $userAcc->pincode = $pin_code;
        $userAcc->save();

        return $userAcc;
    }

    public function findAdministrativeUsersForBranchWithEmailSettings(string $org_id ,string $branch_id, string $crmType, bool $emailTypeCheck, bool $onlyAdministrator, bool $withTrashed)
    {
        $user_list = $this->user->Active()
            ->with(['roles', 'emailTypes'])
            ->where(function ($userQuery) use ($branch_id) {
                $userQuery
                    ->where(function ($userSubSuery) use ($branch_id) {

                        $userSubSuery
                            ->whereHas('roles', function ($roleQuery) {
                                $roleQuery->where('type', '=', RoleType::ADMINPORTAL);
                            })
                            ->where('site_manager', '=', '0')
                            ->where('branch_id', '=', $branch_id);

                    })
                    ->orWhere(function ($userSubSuery) {

                        $userSubSuery
                            ->whereHas('roles', function ($roleQuery) {
                                $roleQuery->where('type', '=', RoleType::ORGADMIN);
                            })
                            ->where('site_manager', '=', '1')
                            ->whereNull('branch_id');

                    });
            })
            ->where('organization_id', '=', $org_id)
            ->when($withTrashed, function ($query) {
                return $query->withTrashed();
            })
            ->when($onlyAdministrator, function ($query) {
                return $query->whereHas('roles', function ($roleQuery) {
                    $roleQuery->where('is_admin', '=', '1');
                });
            })
            ->when($emailTypeCheck, function ($query) use ($crmType) {
                return $query->whereHas('emailTypes', function ($emailTypeQuery) use ($crmType) {
                    $emailTypeQuery->where('type', 'ILIKE', '%' . $crmType . '%');
                });
            })
            ->get();

        return $user_list;
    }

    /**
     * @param Collection
     * @param string $user_model
     * @return Builder[]|Collection
     */
    public function getStaffList(string $user_model){

        $user_list = app("Kinderm8\\{$user_model}")
            ->with(['roles'])
            ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id')
            ->where('km8_users.organization_id', '=', auth()->user()->organization_id)
            ->where('km8_users.branch_id', '=', auth()->user()->branch_id)
            ->whereNull('km8_users.deleted_at')
            ->where('km8_users.status', '=', '0')
            ->where('km8_roles.type', 'ILIKE', '%'. RoleType::ADMINPORTAL .'%')
            ->select(['km8_users.*'])
            ->groupBy(['km8_users.id'])
            ->orderBy('km8_users.first_name','asc')
            ->get();

        return $user_list;
    }

}
