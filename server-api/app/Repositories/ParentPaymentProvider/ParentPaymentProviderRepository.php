<?php

namespace Kinderm8\Repositories\ParentPaymentProvider;


use DBHelper;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\ParentPaymentProvider;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Traits\UserAccessibility;
use PaymentHelpers;
use Pdp\Exception;

class ParentPaymentProviderRepository implements IParentPaymentProviderRepository
{
    use UserAccessibility;

    private $parentPaymentProvider;

    private $sortColumnsMap = [];

    public function __construct(ParentPaymentProvider $parentPaymentProvider)
    {
        $this->parentPaymentProvider = $parentPaymentProvider;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->parentPaymentProvider, $method], $args);
    }

    public function findById(int $id)
    {

        $paymentTerm = $this->parentPaymentProvider->withTrashed()->find($id);

        if (is_null($paymentTerm)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $paymentTerm;

    }

    public function list(Request $request, array $args)
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
        $provider_list = $this->parentPaymentProvider->query();

        $provider_list = $this->attachAccessibilityQuery($provider_list);

        //get actual count
        $actualCount = $provider_list->get()->count();

        //filters
        if (!is_null($filters)) {

            $provider_list->when(isset($filters->status) && $filters->status !== 'all', function($query) use($filters) {
                return $query->where('status', '=', $filters->status);
            });

        }

        //search
        if (!is_null($searchValue)) {

            $provider_list
                ->where('payment_type', 'ILIKE', '%' . $searchValue . '%')
                ->orWhere(function($query) use($searchValue) {
                    $query->whereHas('branch', function($subquery) use($searchValue) {
                        $subquery->where('name', 'ILIKE', '%' . $searchValue . '%');
                    });
                });
        }

        //sorting
        if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
            $provider_list->orderBy(
                Arr::get($this->sortColumnsMap, $sortOption->key),
                Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
            );
        } else {
            $provider_list->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
        }

        $provider_list = $provider_list
            ->paginate($offset);

        $provider_list->load([
            'branch',
            'organization'
        ]);

        return [
            'list' => $provider_list,
            'totalRecords' => $actualCount,
            'filtered' => !is_null($filters),
            'providerFull' => PaymentHelpers::parentPaymentProviderFull(auth()->user()->organization_id, $request)
        ];

    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {

        $provider_list = $this->parentPaymentProvider
            ->with((!empty($depends)) ? $depends : []);

        //access
        $provider_list = $this->attachAccessibilityQuery($provider_list);

        if ($withTrashed)
        {
            $provider_list->withTrashed();
        }

        if (is_array($args) && !empty($args))
        {
            $provider_list
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['key']), function ($query) use ($args)
                {
                    return $query->whereJsonContains('configurations', [['value' => $args['key']]]);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy("{$args['order']['column']}", $args['order']['value']);
                });
        }
        // default
        else
        {
            $provider_list->orderBy('id', 'desc');
        }

        return $provider_list->get();

    }

    public function store(Request $request)
    {

        $branch_id = Helpers::decodeHashedID($request->input('branch'));
        $branch = app(IBranchRepository::class)->findById($branch_id);

        if (PaymentHelpers::parentPaymentProviderFull($branch->organization_id, $request) === true) {
            throw new Exception('Provider limit for branch reached', ErrorType::CustomValidationErrorCode);
        }

        $payment_provider = new $this->parentPaymentProvider;
        $payment_provider->organization_id = $branch->organization_id;
        $payment_provider->branch_id = $branch_id;
        $payment_provider->payment_type = $request->input('payment_type');
        $payment_provider->configurations = $request->input('configuration');
        $payment_provider->status = '0';
        $payment_provider->save();

        return $payment_provider;
        
    }

    public function update(Request $request)
    {

        $payment_provider = $this->findById(Helpers::decodeHashedID($request->input('provider_id')));
        $payment_provider->payment_type = $request->input('payment_type');
        $payment_provider->configurations = $request->input('configuration');
        $payment_provider->status = $request->input('status');
        $payment_provider->save();

        return $payment_provider;

    }

    public function delete(int $id)
    {

        $payment_provider = $this->findById($id);
        $payment_provider->delete();

    }

}
