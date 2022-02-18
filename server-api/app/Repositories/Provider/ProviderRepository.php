<?php

namespace Kinderm8\Repositories\Provider;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Illuminate\Http\Request;
use Kinderm8\ProviderSetup;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Service\IServiceRepository;
use Kinderm8\Repositories\User\IUserRepository;

class ProviderRepository implements IProviderRepository
{
    use UserAccessibility;

    private $provider;

    public function __construct(
        ProviderSetup $provider
    )
    {
        $this->provider = $provider;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->service, $method], $args);
    }

    public function findByOrgId(string $orgId) {

        return $this->provider->where('organization_id', $orgId)->first();

    }

    public function findById($id, array $depends)
    {
        $provider_setup = $this->provider->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $provider_setup->with($depends);
        }

        $provider_setup = $provider_setup->first();

        if (is_null($provider_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $provider_setup;
    }

    public function findByService(int $service_id, array $depends)
    {

        $service = app(IServiceRepository::class)->findById($service_id, ['provider']);

        $provider_setup = $service->provider;

        if (is_null($provider_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $provider_setup->load($depends);
        }

        return $provider_setup;

    }

    public function findByBranch(int $branch_id, array $depends)
    {

        $branch = app(IBranchRepository::class)->findById($branch_id, ['providerService.provider']);

        $provider_setup = $branch->providerService->provider;

        if (is_null($provider_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $provider_setup->load($depends);
        }

        return $provider_setup;
        
    }

    public function findByUser(int $user_id, array $depends)
    {

        $user = app(IUserRepository::class)->findById($user_id, ['branch.providerService.provider']);

        $provider_setup = $user->branch->providerService->provider;

        if (is_null($provider_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $provider_setup->load($depends);
        }

        return $provider_setup;
        
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {

        $list = $this->provider
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
                ->when(isset($args['synced']), function ($query) use ($args)
                {
                    return $query->where('is_synced', $args['synced']);
                });
        }
        
        $list->orderBy('id', 'asc');

        return $list->get();

    }

}
