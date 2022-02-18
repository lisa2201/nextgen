<?php

namespace Kinderm8\Repositories\Supplier;

use Arr;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\Supplier;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;

class SupplierRepository implements ISupplierRepository
{
    use UserAccessibility;


    private $supplier;

    public function __construct(Supplier $supplier)
    {
        $this->supplier = $supplier;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->supplier, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        $supplier = $this->supplier
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // access
        $supplier = $this->attachAccessibilityQuery($supplier);

        if (is_array($args) && !empty($args))
        {
            $supplier
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $supplier->orderBy('id', 'asc');
        }

        $supplier = $supplier->get();

        return $supplier;
    }

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

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $supplier_list = $this->supplier
            ->with(['creator','branch']);

            //access
            $supplier_list = $this->attachAccessibilityQuery($supplier_list);


            //get actual count
            $actualCount = $supplier_list
                ->get()
                ->count();


            //search
            if(!is_null($searchValue))
            {
                $searchList = [];
                    $searchList = [
                        'km8_suppliers.name',
                    ];

                if(!empty($searchList))
                {
                    $supplier_list->whereLike($searchList, $searchValue);
                }
            }

            $supplier_list->orderBy('km8_suppliers.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);


            $supplier_list = $supplier_list
                ->groupBy('id')
                ->paginate($offset);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $supplier_list = [];
        }

        return [
            'list' => $supplier_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    public function store(Request $request)
    {
        $supplierAcc = new $this->supplier;

        $supplierAcc->organization_id = auth()->user()->organization_id;
        $supplierAcc->branch_id = auth()->user()->branch_id;
        $supplierAcc->created_by = auth()->user()->id;
        $supplierAcc->name = $request->input('name');
        $supplierAcc->address = $request->input('address');
        $supplierAcc->gst = $request->input('gst');

        $supplierAcc->save();
        return $supplierAcc;
    }

    public function findById($id, array $depends)
    {
        $supplier = $this->supplier->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $supplier->with($depends);
        }

        $supplier = $supplier->first();

        if (is_null($supplier))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $supplier;
    }

    public function update(Request $request)
    {

        $supplierAcc = $this->findById(Helpers::decodeHashedID($request->input('id')),['creator','branch']);

        $supplierAcc->name = $request->input('name');
        $supplierAcc->address = $request->input('address');
        $supplierAcc->gst = $request->input('gst');

        $supplierAcc->save();
        return $supplierAcc;
    }


    public function delete(string $id)
    {
        $supplier = $this->findById($id, []);

        // copy for reference
        $clone = $supplier;

        if ($supplier->deleted_at != null)
        {
            $supplier->forceDelete();
        }
        else
        {
            $supplier->delete();
        }

        return $clone;
    }

}
