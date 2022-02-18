<?php

namespace Kinderm8\Repositories\Branch;

use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Kinderm8\Branch;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Illuminate\Support\Str;

class BranchRepository implements IBranchRepository
{
    use UserAccessibility;

    private $branch;

    public function __construct(Branch $branch)
    {
        $this->branch = $branch;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->branch, $method], $args);
    }

    public function getModelName()
    {
        return get_class($this->branch);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @return Collection
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        $list = $this->branch
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            });

        // access
        $list = $this->attachAccessibilityQuery($list, null, null, true);

        if (is_array($args) && !empty($args))
        {
            $list
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
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
            $list->orderBy('date', 'asc');
        }

        return $list->get();
    }

    /**
     * @param array $args
     * @param bool $withTrashed
     * @return Collection
     * @options [ status: string, deleted: boolean, order: { column - name, value - asc|desc ]
     */
    public function list($args = [], $withTrashed = false)
    {
        $branchList = $this->branch->with('providerService');

        // access
        $branchList = $this->attachAccessibilityQuery($branchList, null, null, true);

        $branchList->when($withTrashed, function ($query) use ($args)
        {
            return $query->withTrashed();
        });

        if(is_array($args) && !empty($args))
        {
            $branchList
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
            $branchList->orderBy('id', 'asc');
        }

        return $branchList->get();
    }

    /**
     * @param Request $request
     * @return Branch
     */
    public function store(Request $request)
    {
        $newObj = new $this->branch;

        //required fields
        $newObj->subdomain_name = $request->input('domain');
        $newObj->name = $request->input('name');
        $newObj->organization_id = (! Helpers::IsNullOrEmpty($request->input('org'))) ? Helpers::decodeHashedID($request->input('org')) : auth()->user()->organization_id;
        $newObj->status = ($request->input('status') == false) ? '1' : '0';
        $newObj->timezone = (! Helpers::IsNullOrEmpty($request->input('timezone'))) ? $request->input('timezone') : auth()->user()->organization->timezone;
        $newObj->country_code = (! Helpers::IsNullOrEmpty($request->input('country'))) ? $request->input('country') : null;
        $newObj->email = (! Helpers::IsNullOrEmpty($request->input('email'))) ? $request->input('email') : null;

        //non-required fields
        $newObj->description = (! Helpers::IsNullOrEmpty($request->input('desc'))) ? $request->input('desc') : null;
        $newObj->phone_number = (! Helpers::IsNullOrEmpty($request->input('phone'))) ? $request->input('phone') : null;
        $newObj->fax_number = (! Helpers::IsNullOrEmpty($request->input('fax'))) ? $request->input('fax') : null;
        $newObj->address_1 = (! Helpers::IsNullOrEmpty($request->input('address1'))) ? $request->input('address1') : null;
        $newObj->address_2 = (! Helpers::IsNullOrEmpty($request->input('address2'))) ? $request->input('address2') : null;
        $newObj->zip_code = (! Helpers::IsNullOrEmpty($request->input('zipcode'))) ? $request->input('zipcode') : null;
        $newObj->city = (! Helpers::IsNullOrEmpty($request->input('city'))) ? $request->input('city') : null;

        $newObj->media_logo_id = (! Helpers::IsNullOrEmpty($request->input('logo'))) ? Helpers::decodeHashedID($request->input('logo')) : null;
        $newObj->media_cover_id = (! Helpers::IsNullOrEmpty($request->input('cover'))) ? Helpers::decodeHashedID($request->input('cover')) : null;

        $newObj->service_id = (! Helpers::IsNullOrEmpty($request->input('service'))) ? Helpers::decodeHashedID($request->input('service'))  : null;
        $newObj->opening_hours = ($request->input('open_days') !== '') ?$request->input('open_days') : null;
        $newObj->pincode =  (! Helpers::IsNullOrEmpty($request->input('pincode'))) ? $request->input('pincode') : null;

        $newObj->save();

        return $newObj;
    }

    /**
     * @param $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id)
    {
        $branch = $this->branch
            ->where('id', $id)
            ->withTrashed()
            ->with('providerService.provider')
            ->first();

        if (is_null($branch))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $branch;
    }

    /**
     * @param $reference
     * @param array $depends
     * @param bool $withTrashed
     * @param bool $throwable
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByIds($reference, array $depends, bool $withTrashed, bool $throwable)
    {
        $list = $this->branch
            ->whereIn('id', $reference)
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            });

        $list = $list->get();

        if ($throwable && $list->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $list;
    }

    /**
     * @param string $domain
     * @param string|null $ignore
     * @param bool $withTrashed
     * @param array $depends
     * @return mixed
     */
    public function findByDomain(string $domain, ?string $ignore, bool $withTrashed, array $depends)
    {
        $query = $this->branch->where('subdomain_name', '=', $domain);

        if($withTrashed)
        {
            $query->withTrashed();
        }

        //ignore this data
        if (!is_null($ignore))
        {
            $query->where('id', '!=', $ignore);
        }

        if(!empty($depends))
        {
            $query->with($depends);
        }

        return $query->first();
    }

    /**
     * @param string $id
     * @param array $args
     * @param bool $withTrashed
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByOrg(string $id, array $args, bool $withTrashed)
    {
        $branches = $this->branch->where('organization_id', $id);

        if(is_array($args) && !empty($args))
        {
            $branches->when(isset($args['status']), function ($query) use ($args)
            {
                return $query->where('status', $args['status']);
            });
        }

        if($withTrashed)
        {
            $branches->withTrashed();
        }

        $branches = $branches->orderBy('name', 'asc')->get();

        if (empty($branches))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $branches;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request)
    {
        $rowObj = $this->findById($id);

        //required fields
        // $rowObj->subdomain_name = $request->input('domain');
        $rowObj->name = $request->input('name');
        $rowObj->status =  (! $request->input('status')) ? '1' : '0';
        $rowObj->timezone = (! Helpers::IsNullOrEmpty($request->input('timezone'))) ? $request->input('timezone') : auth()->user()->organization->timezone;
        $rowObj->service_id = (! Helpers::IsNullOrEmpty($request->input('service'))) ? Helpers::decodeHashedID($request->input('service'))  : null;

        //non-required fields
        $rowObj->description = (! Helpers::IsNullOrEmpty($request->input('desc'))) ? $request->input('desc') : null;
        $rowObj->phone_number = (! Helpers::IsNullOrEmpty($request->input('phone'))) ? $request->input('phone') : null;
        $rowObj->fax_number = (! Helpers::IsNullOrEmpty($request->input('fax'))) ? $request->input('fax') : null;
        $rowObj->address_1 = (! Helpers::IsNullOrEmpty($request->input('address1'))) ? $request->input('address1') : null;
        $rowObj->address_2 = (! Helpers::IsNullOrEmpty($request->input('address2'))) ? $request->input('address2') : null;
        $rowObj->zip_code = (! Helpers::IsNullOrEmpty($request->input('zipcode'))) ? $request->input('zipcode') : null;
        $rowObj->city = (! Helpers::IsNullOrEmpty($request->input('city'))) ? $request->input('city') : null;

        $rowObj->media_logo_id = (! Helpers::IsNullOrEmpty($request->input('logo'))) ? Helpers::decodeHashedID($request->input('logo')) : null;
        $rowObj->media_cover_id = (! Helpers::IsNullOrEmpty($request->input('cover'))) ? Helpers::decodeHashedID($request->input('cover')) : null;

        $rowObj->service_id = (! Helpers::IsNullOrEmpty($request->input('service'))) ? Helpers::decodeHashedID($request->input('service'))  : null;
        $rowObj->opening_hours = ($request->input('open_days') !== '') ?$request->input('open_days')  : null;
        $rowObj->pincode =  (! Helpers::IsNullOrEmpty($request->input('pincode'))) ? $request->input('pincode') : null;

        $rowObj->update();

        //remove branch cache
        //Cache::forget(CacheHelper::CACHE_DOMAIN_CHECK);

        return $rowObj;
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

        $branch = $this->findById($id);

        if(!is_null($branch) && $branch->status != $option)
        {
            $branch->status = $option;

            $branch->save();

            //remove branch cache
            //Cache::forget(CacheHelper::getCachePrefixDomain(CacheHelper::CACHE_DOMAIN_CHECK, $branch->subdomain_name));
        }

        return $branch;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $rowObj = $this->findById($id);

        //remove branch cache
        //Cache::forget(CacheHelper::getCachePrefixDomain(CacheHelper::CACHE_DOMAIN_CHECK, $rowObj->subdomain_name));

        if ($rowObj->deleted_at != null)
        {
            $rowObj->forceDelete();
        }
        else
        {
            $rowObj->delete();
        }

        return true;
    }

    /**
     * @param string $pincode
     * @return collection
     */
    public function getClientId(string $pincode)
    {
        $client_id = null;
        $pincode = Str::lower($pincode);

        $client = $this->branch->whereRaw('LOWER(pincode) = ?', $pincode)->first();
        if($client) {
            $client_id = Helpers::hxCode($client->id);
        }
        $data['client'] = $client;
        $data['client_id'] = $client_id;

        return $data;
    }

    /**
     * @param string $domain
     * @return collection
     */
    public function getClientIdByDomain(string $domain)
    {
        $client_id = null;
        $domain = Str::lower($domain);

        $client = $this->branch->whereRaw('LOWER(subdomain_name) = ?', $domain)->first();
        if($client) {
            $client_id = Helpers::hxCode($client->id);
        }
        $data['client'] = $client;
        $data['client_id'] = $client_id;

        return $data;
    }

}
