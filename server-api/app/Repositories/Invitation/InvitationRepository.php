<?php

namespace Kinderm8\Repositories\Invitation;

use Carbon\Carbon;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\UserInvitation;

class InvitationRepository implements IInvitationRepository
{
    use UserAccessibility;

    private $sortColumnsMap = [
        'email' => 'km8_user_invitations.user_email',
        'branch' => 'km8_organization_branch.name',
        'expires' => 'km8_user_invitations.expires_at'
    ];

    private $invitation;

    public function __construct(UserInvitation $invitation)
    {
        $this->invitation = $invitation;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->invitation, $method], $args);
    }

    /**
     * @param Request $request
     * @param Model|null $invitationObj
     * @param Collection|null $branches
     * @param string $user_model
     * @param string $role_model
     * @return mixed|null
     * @throws BindingResolutionException
     */
    public function accept(Request $request, ?Model $invitationObj, ?Collection $branches, string $user_model, string $role_model)
    {
        $firstUserAcc = null;

        // site manager invitation
        if ($invitationObj->site_manager === '1')
        {
            $userAcc = app()->make("Kinderm8\\{$user_model}");

            $userAcc->email = $invitationObj->user_email;
            $userAcc->organization_id = $invitationObj->organization_id;
            $userAcc->first_name = $request->input('first');
            $userAcc->last_name = $request->input('last');
            $userAcc->dob = $request->input('dob');
            $userAcc->password = bcrypt($request->input('password'));
            $userAcc->phone = (!Helpers::IsNullOrEmpty($request->input('phone'))) ? $request->input('phone') : null;
            $userAcc->address_1 = (!Helpers::IsNullOrEmpty($request->input('address1'))) ? $request->input('address1') : null;
            $userAcc->address_2 = (!Helpers::IsNullOrEmpty($request->input('address2'))) ? $request->input('address2') : null;
            $userAcc->site_manager = '1';
            $userAcc->status = '0';
            $userAcc->login_access = '0';
            $userAcc->email_verified = true;

            $userAcc->save();

            //set user reference
            $firstUserAcc = $userAcc;

            //attach roles to user
            $roles = app("Kinderm8\\{$role_model}")->find($invitationObj->role_data)->makeVisible(['id']);
            $userAcc->assignRole($roles);

            unset($roles);
        }
        else
        {
            $pin_code = Helpers::generatePinCode(4, $user_model, $invitationObj->organization_id);

            foreach ($branches as $key => $branch)
            {
                // $userAcc = !is_null($registeredUser) ? $registeredUser : app()->make("Kinderm8\\{$user_model}");
                $userAcc = app()->make("Kinderm8\\{$user_model}");
                $userAcc->email = $invitationObj->user_email;
                $userAcc->organization_id = $invitationObj->organization_id;
                $userAcc->branch_id = $branch->id;
                $userAcc->first_name = $request->input('first');
                $userAcc->last_name = $request->input('last');
                $userAcc->dob = $request->input('dob');
                $userAcc->password = bcrypt($request->input('password'));
                $userAcc->phone = (!Helpers::IsNullOrEmpty($request->input('phone'))) ? $request->input('phone') : null;
                $userAcc->address_1 = (!Helpers::IsNullOrEmpty($request->input('address1'))) ? $request->input('address1') : null;
                $userAcc->address_2 = (!Helpers::IsNullOrEmpty($request->input('address2'))) ? $request->input('address2') : null;
                $userAcc->status = '0';
                $userAcc->login_access = '0';
                $userAcc->email_verified = true;
                $userAcc->pincode = in_array(RoleType::ADMINPORTAL, array_column($invitationObj->role_data, 'type')) ? $pin_code : null;
                $userAcc->save();

                //set user reference
                if ($key === 0) $firstUserAcc = $userAcc;

                //attach roles to user
                $role_ids = Helpers::filter_by_key_array($invitationObj->role_data, 'branch', $branch->id)['data']['roles'];
                $roles = app("Kinderm8\\{$role_model}")->find($role_ids)->makeVisible(['id']);
                $userAcc->assignRole($roles);

                unset($role_ids);
                unset($roles);

                /*------------- Create Relationship with Child (Waitlist) --------------*/

                if (!is_null($invitationObj->child_id))
                {
                    $userAcc->parents()->attach($invitationObj->child_id);
                }
            };
        }

        /*------------- delete invitation --------------*/

        $invitationObj->delete();

        return $firstUserAcc;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return UserInvitation
     * @throws ResourceNotFoundException
     */
    public function resend(string $id, Request $request)
    {
        $invitationObj = $this->findById($id);

        $invitationObj->token = Helpers::generateToken();
        $invitationObj->expires_at = Carbon::now()->addDays((int) config('user-settings.token_expiry'));

        $invitationObj->update();

        return $invitationObj;
    }

    /**
     * @param $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id)
    {
        $invitation = $this->invitation->where('id', $id)->first();

        if (is_null($invitation))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $invitation;
    }

    /**
     * @param Request $request
     * @param string $user_model
     * @return bool
     */
    public function findByEmail(Request $request, string $user_model)
    {
        $value = rtrim($request->input('value'));
        $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;
        $org_id = !Helpers::IsNullOrEmpty($request->input('org_id')) ? Helpers::decodeHashedID($request->input('org_id')) : null;

        // query builder
        $queryInvitation = $this->invitation->where('user_email', '=', $value);
        $queryInvitation = $this->attachAccessibilityQuery($queryInvitation, $org_id);

        $queryUsers = app("Kinderm8\\{$user_model}")->where('email', '=', $value);
        $queryUsers = $this->attachAccessibilityQuery($queryUsers, $org_id);

        if (!is_null($index))
        {
            $queryInvitation = $this->ignoreCurrentIndex($queryInvitation, $index);
            $queryUsers = $this->ignoreCurrentIndex($queryUsers, $index);
        }

        $email_collection = array_unique(array_merge(
            $queryInvitation->pluck('user_email')->toArray(),
            $queryUsers->pluck('email')->toArray()
        ));

        return !empty($email_collection);
    }

    /**
     * @param string $token
     * @return mixed
     */
    public function findByToken(string $token)
    {
        $invitation = $this
            ->invitation
            ->where('token', $token)
            ->first();

        return $invitation;
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

        try
        {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $user_invitations = $this->invitation->leftJoin('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_user_invitations.branch_id');

            //access
            $user_invitations = $this->attachAccessibilityQuery($user_invitations, null, 'km8_user_invitations');

            //get actual count
            $actualCount = $user_invitations->get()->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters->status) && $filters->status !== '0')
                {
                    $user_invitations->whereRaw("DATE(km8_user_invitations.expires_at) " . (($filters->status === '1') ? "<" : ">") . " '" . Carbon::now()->toDateString() . "'");
                }

                if (isset($filters->branch) && !is_null($filters->branch))
                {
                    if (strtolower($filters->branch) === 'none')
                    {
                        $user_invitations->whereNull('branch_id');
                    } else {
                        $user_invitations->where('branch_id', Helpers::decodeHashedID($filters->branch));
                    }
                }
            }

            //search
            if (!is_null($searchValue))
            {
                $user_invitations->whereLike([
                    'km8_user_invitations.user_email',
                    'km8_organization_branch.name'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            {
                $user_invitations->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            }
            else
            {
                $user_invitations->orderBy('km8_user_invitations.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $user_invitations = $user_invitations
                ->select(['km8_user_invitations.*'])
                ->paginate($offset);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $user_invitations = [];
        }

        return [
            'list' => $user_invitations,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param Request $request
     * @return UserInvitation
     */
    public function store(Request $request)
    {
        $invitationObj = new $this->invitation;

        $invitationObj->user_email = $request->input('email');
        $invitationObj->organization_id = auth()->user()->isRoot() ? Helpers::decodeHashedID($request->input('org')) : auth()->user()->organization_id;
        $invitationObj->branch_id = ($request->input('branch') != '') ? Helpers::decodeHashedID($request->input('branch')) : null;

        /* --------------- set role data -----------------*/

        $role_data = [];

        foreach ($request->input('role_map') as $key => $role)
        {
            if ($request->input('type') === '0')
            {
                array_push($role_data, [
                    'branch' => Helpers::decodeHashedID($key),
                    'roles' => Helpers::decodeHashedID($role['roles']),
                    'type' => $role['type']
                ]);
            }
            // site-manager setup
            else
            {
                array_push($role_data, Helpers::decodeHashedID($role));
            }
        };

        $invitationObj->role_data = $role_data;

        /* -------------------------------------*/

        $invitationObj->site_manager = $request->input('type');
        $invitationObj->token = Helpers::generateToken();
        $invitationObj->expires_at = Carbon::now()->addDays((int) config('user-settings.token_expiry'));

        $invitationObj->save();

        return $invitationObj;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request)
    {
        $invitationObj = $this->findById($id);

        $invitationObj->user_email = $request->input('email');
        $invitationObj->organization_id = auth()->user()->isRoot() ? Helpers::decodeHashedID($request->input('org')) : auth()->user()->organization_id;
        $invitationObj->branch_id = ($request->input('branch') != '') ? Helpers::decodeHashedID($request->input('branch')) : null;

        /* --------------- set role data -----------------*/

        $role_data = [];

        foreach ($request->input('role_map') as $key => $role)
        {
            if($request->input('type') === '0')
            {
                array_push($role_data, [
                    'branch' => Helpers::decodeHashedID($key),
                    'roles' => Helpers::decodeHashedID($role['roles']),
                    'type' => $role['type']
                ]);
            }
            // site-manager setup
            else
            {
                array_push($role_data, Helpers::decodeHashedID($role));
            }
        };

        $invitationObj->role_data = $role_data;

        /* -------------------------------------*/

        //$invitationObj->site_manager = $request->input('type');
        $invitationObj->token = Helpers::generateToken();
        $invitationObj->expires_at = Carbon::now()->addDays((int) config('user-settings.token_expiry'));

        $invitationObj->update();

        return $invitationObj;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $invitation = $this->findById($id);

        $invitation->delete();

        return true;
    }

    /**
     * @param $id
     * @throws ResourceNotFoundException
     */
    public function manualDelete($id)
    {
        $delObj = $this->findById($id);

        if (!is_null($delObj)) $delObj->delete();

        unset($delObj);
    }

}
