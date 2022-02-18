<?php

namespace Kinderm8\Repositories\CCSSetup;

use Carbon\Carbon;
use DBHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Kinderm8\CcsSetup;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Provider\IProviderRepository;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use Log;

use function GuzzleHttp\json_encode;

class CCSSetupRepository implements ICCSSetupRepository
{
    use UserAccessibility;

    private $ccsSetup;

    public function __construct(
        CcsSetup $ccsSetup
    )
    {
        $this->ccsSetup = $ccsSetup;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->ccsSetup, $method], $args);
    }

    public function findById(int $id, array $depends)
    {
        $ccs_setup = $this->ccsSetup->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $ccs_setup->with($depends);
        }

        $ccs_setup = $ccs_setup->first();

        if (is_null($ccs_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $ccs_setup;
    }

    public function findByProvider(int $provider_id, array $depends)
    {

        $provider = app(IProviderRepository::class)->findById($provider_id, ['ccsSetup']);

        $ccs_setup = $provider->ccsSetup;

        if (is_null($ccs_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $ccs_setup->load($depends);
        }

        return $ccs_setup;

    }

    public function findByService(int $service_id, array $depends)
    {

        $service = app(IServiceRepository::class)->findById($service_id, ['provider.ccsSetup']);

        $ccs_setup = $service->provider->ccsSetup;

        if (is_null($ccs_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $ccs_setup->load($depends);
        }

        return $ccs_setup;

    }

    public function findByBranch(int $branch_id, array $depends)
    {
        $branch = app(IBranchRepository::class)->findById($branch_id, ['providerService.provider.ccsSetup']);

        $ccs_setup = $branch->providerService->provider->ccsSetup;

        if (is_null($ccs_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $ccs_setup->load($depends);
        }

        return $ccs_setup;
    }

    public function findByUser(int $user_id, array $depends)
    {

        $user = app(IUserRepository::class)->findById($user_id, ['branch.providerService.provider.ccsSetup']);

        $ccs_setup = $user->branch->providerService->provider->ccsSetup;

        if (is_null($ccs_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $ccs_setup->load($depends);
        }

        return $ccs_setup;

    }

    public function list(Request $request)
    {

        $actualCount = 0;
        $filters = null;


        //pagination
        $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

        //search
        $searchValue = (!Helpers::IsNullOrEmpty($request->get('search'))) ? Helpers::sanitizeInputString($request->get('search'), true) : null;

        //sort
        $sortOption = (!Helpers::IsNullOrEmpty($request->get('sort')) && is_null($searchValue)) ? json_decode($request->get('sort')) : null;

        //filters
        $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

        //query builder
        $ccs_setups = $this->ccsSetup->query();

        $ccs_setups = $this->attachAccessibilityQuery($ccs_setups);

        //get actual count
        $actualCount = $ccs_setups->get()->count();

        //filters
        if (!is_null($filters)) {

            if (isset($filters->status) && $filters->status !== 'all') {
                $ccs_setups->where('key_expire', ($filters->status === '0') ? ">" : "<", Carbon::now());
            }

        }

        //search
        if (!is_null($searchValue)) {

            $ccs_setups->whereLike([
                'device_name',
                'PRODA_org_id',
                'person_id',
                'activation_code'
            ], $searchValue);

        }

        //sorting
        if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
            $ccs_setups->orderBy(
                Arr::get($this->sortColumnsMap, $sortOption->key),
                Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
            );
        } else {
            $ccs_setups->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
        }

        $ccs_setups = $ccs_setups
            ->paginate($offset);

        return [
            'items' => $ccs_setups,
            'totalRecords' => $actualCount,
            'filtered' => !is_null($filters)
        ];

    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {

        $list = $this->ccsSetup
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // access
        $list = $this->attachAccessibilityQuery($list, null, null, true);

        if (is_array($args) && !empty($args))
        {
            $list
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                });
        }

        $list->orderBy('id', 'asc');

        return $list->get();

    }
}
