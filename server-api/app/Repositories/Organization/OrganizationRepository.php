<?php

namespace Kinderm8\Repositories\Organization;

use Carbon\Carbon;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Organization;

class OrganizationRepository implements IOrganizationRepository
{
    private $organization;

    private $sortColumnsMap = [
        'company_name' => 'km8_organization.company_name',
        'email' => 'km8_organization.email',
        'no_of_branches' => 'km8_organization.no_of_branches',
        'cdate' => 'km8_organization.created_at'
    ];

    public function __construct(Organization $organization)
    {
        $this->organization = $organization;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->organization, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @return array
     */
    public function list(array $args, array $depends, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int)$request->input('offset') : 10;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $org_list = $this->organization->query();

            //get actual count
            $actualCount = $org_list->get()->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters->status) && $filters->status != '')
                {
                    $org_list->where('status', $filters->status);
                }

                if (isset($filters->date) && $filters->date != '')
                {
                    $org_list->whereDate('created_at', Carbon::parse($filters->date)->format('Y-m-d'));
                }

                if (isset($filters->plan) && $filters->plan != '')
                {
                    $org_list->where('plan', $filters->plan);
                }
            }

            //search
            if (!is_null($searchValue))
            {
                $searchList = [
                    'company_name',
                    'email'
                ];

                if (!empty($searchList))
                {
                    $org_list->whereLike($searchList, $searchValue);
                }
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            {
                $org_list->orderBy(
                    $this->sortColumnsMap[$sortOption->key],
                    DBHelper::TABLE_SORT_VALUE_MAP[$sortOption->value]
                );
            }
            else
            {
                $org_list->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[0]);
            }

            $org_list = $org_list->paginate($offset);

            // load relationships after pagination
            $org_list->load(!empty($depends) ? $depends : ['branch', 'subscriptions', 'ccs_info']);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $org_list = [];
        }

        return [
            'list' => $org_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param $id
     * @param array $depends
     * @param bool $withTrashed
     * @return Model|null
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends, bool $withTrashed)
    {
        $org = $this->organization->where('id', $id);

        // attach relationship data
        if(!empty($depends))
        {
            $org->with($depends);
        }

        $org->when($withTrashed, function ($query)
        {
            return $query->withTrashed();
        });

        $org = $org->first();

        if (is_null($org))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $org;
    }

    /**
     * @param Model $org_user
     * @param Model $admin_role
     * @param string $user_model
     * @param Request $request
     * @return array
     */
    public function linkBranches(Model $org_user, Model $admin_role, string $user_model, Request $request)
    {
        $linkedUsers = [];

        // delete
        if ($request->input('action') === '1')
        {
            $users = app("Kinderm8\\{$user_model}")
                ->withTrashed()
                ->where('email', $org_user->email)
                ->where('organization_id', $org_user->organization_id)
                ->whereIn('branch_id', Helpers::decodeHashedID($request->input('reference')))
                ->get();

            app("Kinderm8\\{$user_model}")
                ->whereIn('id', $users->pluck('id'))
                ->delete();

            $linkedUsers = array_merge($linkedUsers, $users->toArray());
        }
        // add
        else
        {
            foreach ($request->input('reference') as $branch)
            {
                $profile = app("Kinderm8\\{$user_model}")->withTrashed()->updateOrCreate(
                    [
                        'organization_id' => $org_user->organization_id,
                        'branch_id' => Helpers::decodeHashedID($branch),
                        'email' => $org_user->email
                    ],
                    [
                        'site_manager' => $org_user->site_manager,
                        'first_name' => $org_user->first_name,
                        'middle_name' => $org_user->middle_name,
                        'last_name' => $org_user->last_name,
                        'password' => $org_user->password,
                        'dob' => $org_user->dob,
                        'phone' => $org_user->phone,
                        'address_1' => $org_user->address_1,
                        'address_2' => $org_user->address_2,
                        'zip_code' => $org_user->zip_code,
                        'city' => $org_user->city,
                        'state' => $org_user->state,
                        'country_code' => $org_user->country_code,
                        'image' => $org_user->image,
                        'second_email' => $org_user->second_email,
                        'need_sec_email' => $org_user->need_sec_email,
                        'status' => $org_user->status,
                        'login_access' => $org_user->login_access,
                        'first_time_login' => $org_user->first_time_login,
                        'email_verified' => $org_user->email_verified,
                        'ccs_id' => $org_user->ccs_id,
                        'phone2' => $org_user->phone2,
                        'invitation_date' => $org_user->invitation_date,
                        'pincode' => $org_user->pincode,
                        'deleted_at' => null
                    ]
                );

                $profile->syncRoles($admin_role);

                array_push($linkedUsers, $profile->toArray());
            }
        }

        return [
            'items' => $linkedUsers,
            'action_is_new' => $request->input('action') === '0'
        ];
    }
}
