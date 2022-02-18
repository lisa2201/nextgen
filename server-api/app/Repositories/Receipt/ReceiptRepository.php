<?php

namespace Kinderm8\Repositories\Receipt;

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
use Kinderm8\Receipt;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;

class ReceiptRepository implements IReceiptRepository
{
    use UserAccessibility;


    private $receipt;

    public function __construct(Receipt $receipt)
    {
        $this->receipt = $receipt;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->receipt, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $throwable)
    {
        $receipt = $this->receipt
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // access
        $receipt = $this->attachAccessibilityQuery($receipt);

        if (is_array($args) && !empty($args))
        {
            $receipt
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                //date range
                ->when(isset($args['date']) && isset($args['date']['start_date']) && isset($args['date']['end_date']) , function ($query) use ($args)
                {
                    return $query->whereBetween('date', [$args['date']['start_date'], $args['date']['end_date']]);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $receipt->orderBy('name', 'asc');
        }

        $receipt = $receipt->get();

        if ($throwable && $receipt->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $receipt;
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
            $supplier_list = $this->receipt
            ->with(['creator','branch','supplier', 'category']);

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
                        'km8_receipt.name',
                    ];

                if(!empty($searchList))
                {
                    $supplier_list->whereLike($searchList, $searchValue);
                }
            }

            $supplier_list->orderBy('km8_receipt.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);


            $supplier_list = $supplier_list
                ->groupBy('id')
                ->get();

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
        $supplierAcc = new $this->receipt;

        $supplierAcc->organization_id = auth()->user()->organization_id;
        $supplierAcc->branch_id = auth()->user()->branch_id;
        $supplierAcc->created_by = auth()->user()->id;

        $supplierAcc->cost = $request->input('cost');
        $supplierAcc->note = $request->input('note');
        $supplierAcc->gst = $request->input('gst');
        $supplierAcc->date = $request->input('date');
        $supplierAcc->gst_amount = $request->input('gst_amount');

        $supplierAcc->total = $request->input('total');
        $supplierAcc->supplier_id = Helpers::decodeHashedID($request->input('supplier'));
        $supplierAcc->category_id = Helpers::decodeHashedID($request->input('category'));

        $supplierAcc->save();
        return $supplierAcc;
    }

    public function findById($id, array $depends)
    {
        $receipt = $this->receipt->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $receipt->with($depends);
        }

        $receipt = $receipt->first();

        if (is_null($receipt))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $receipt;
    }

    public function update(Request $request)
    {

        $supplierAcc = $this->findById(Helpers::decodeHashedID($request->input('id')),['supplier','category']);

        $supplierAcc->cost = $request->input('cost');
        $supplierAcc->note = $request->input('note');
        $supplierAcc->gst = $request->input('gst');
        $supplierAcc->date = $request->input('date');
        $supplierAcc->gst_amount = $request->input('gst_amount');

        $supplierAcc->total = $request->input('total');
        $supplierAcc->supplier_id = Helpers::decodeHashedID($request->input('supplier'));
        $supplierAcc->category_id = Helpers::decodeHashedID($request->input('category'));

        $supplierAcc->save();
        return $supplierAcc;
    }


    public function delete(string $id)
    {
        $receipt = $this->findById($id, []);

        // copy for reference
        $clone = $receipt;

        if ($receipt->deleted_at != null)
        {
            $receipt->forceDelete();
        }
        else
        {
            $receipt->delete();
        }

        return $clone;
    }

    public function script(Request $request)
    {
        $receipt = $this->receipt
                ->where('organization_id', Helpers::decodeHashedID($request->input('data')['org']))
                ->where('branch_id', Helpers::decodeHashedID($request->input('data')['branch']))
                ->where('gst_amount', null)
                ->get();

        if($receipt) {

            foreach($receipt as $data){

                $receiptAcc = $this->findById($data->id,[]);
                $receiptAcc->gst_amount = floatval($data->total) - floatval($data->cost);
                $receiptAcc->save();

                unset($receiptAcc);
            }
        }

        return $receipt;
    }
}
