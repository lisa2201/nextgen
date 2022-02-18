<?php

namespace Kinderm8\Repositories\Service;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Illuminate\Http\Request;
use Kinderm8\ServiceSetup;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\User\IUserRepository;

class ServiceRepository implements IServiceRepository
{
    use UserAccessibility;

    private $service;

    public function __construct(
        ServiceSetup $service
    )
    {
        $this->service = $service;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->service, $method], $args);
    }

    public function findById(int $id, array $depends)
    {
        $service_setup = $this->service->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $service_setup->with($depends);
        }

        $service_setup = $service_setup->first();

        if (is_null($service_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $service_setup;
    }

    public function findByBranch(int $branch_id, array $depends)
    {

        $branch = app(IBranchRepository::class)->findById($branch_id, ['providerService']);

        $service_setup = $branch->providerService;

        if (is_null($service_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $service_setup->load($depends);
        }

        return $service_setup;

    }

    public function findByUser(int $user_id, array $depends)
    {

        $user = app(IUserRepository::class)->findById($user_id, ['branch.providerService']);

        $service_setup = $user->branch->providerService;

        if (is_null($service_setup))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // attach relationship data
        if(!empty($depends))
        {
            $service_setup->load($depends);
        }

        return $service_setup;

    }

    public function store(array $service_data, string $provider_id)
    {

        $service = new $this->service();
        $service->provider_id = $provider_id;
        $service->organization_id = auth()->user()->organization_id;
        $service->service_id = $service_data['results'][0]['serviceID'];
        $service->service_type = $service_data['results'][0]['serviceType'];
        $service->no_of_weeks = $service_data['results'][0]['numberOfWeeksPerYear'];

        $service->service_name = $service_data['results'][0]['ServiceName']['results'][0]['name'];
        $service->start_date = $service_data['results'][0]['startDate'] !== '0000-00-00' ? $service_data['results'][0]['startDate'] : null;
        $service->end_date = $service_data['results'][0]['endDate'] !== '0000-00-00' ? $service_data['results'][0]['endDate'] : null;
        $service->ACECQARegistrationCode = $service_data['results'][0]['ACECQARegistrationCode'];
        $service->address = $service_data['results'][0]['Address']['results'];//json_encode();
        $service->financial = json_encode($service_data['results'][0]['Financial']['results']);
        $service->contact = json_encode($service_data['results'][0]['Contact']['results']);
        $service->is_synced = '1'; // default 1

        $service->save();

        return $service;
    }

    public function read(Request $request, string $person_id, string $ccs_setup_id) {

        $service_client = new \GuzzleHttp\Client();

        $service_url = config('aws.end_points.account_management.add_provider_service');

        $service_response = $service_client->request('GET', $service_url, [
            'headers' => [
                'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                'ccsserviceid ' => $request->input('serviceid'),
                'authpersonid' => $person_id,
                'ccssetupid'=> $ccs_setup_id
            ]
        ]);

        $service_body = $service_response->getBody()->getContents();

        $service_data = json_decode($service_body, true);

        return $service_data;

    }
}
