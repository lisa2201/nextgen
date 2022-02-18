<?php

namespace Kinderm8\Repositories\Reimbursements;

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
use Kinderm8\Reimbursement;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;

class ReimbursementsRepository implements IReimbursementsRepository
{
    use UserAccessibility;


    private $reimbursement;

    public function __construct(Reimbursement $reimbursement)
    {
        $this->reimbursement = $reimbursement;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->reimbursement, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $throwable)
    {
        $reimbursement = $this->reimbursement
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // access
        $reimbursement = $this->attachAccessibilityQuery($reimbursement);

        if (is_array($args) && !empty($args))
        {
            $reimbursement
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
            $reimbursement->orderBy('name', 'asc');
        }

        $reimbursement = $reimbursement->get();

        if ($throwable && $reimbursement->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $reimbursement;
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
            $supplier_list = $this->reimbursement
            ->with(['creator','branch','category']);

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
                        'km8_reimbursements.note',
                        'km8_reimbursements.total',
                    ];

                if(!empty($searchList))
                {
                    $supplier_list->whereLike($searchList, $searchValue);
                }
            }

            $supplier_list->orderBy('km8_reimbursements.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);


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
        $reimbursementAcc = new $this->reimbursement;

        $reimbursementAcc->organization_id = auth()->user()->organization_id;
        $reimbursementAcc->branch_id = auth()->user()->branch_id;
        $reimbursementAcc->created_by = auth()->user()->id;

        $reimbursementAcc->note = $request->input('note');
        $reimbursementAcc->date = $request->input('date');

        $reimbursementAcc->total = $request->input('total');
        $reimbursementAcc->category_id = Helpers::decodeHashedID($request->input('category'));

        $reimbursementAcc->save();
        return $reimbursementAcc;
    }

    public function findById($id, array $depends)
    {
        $reimbursement = $this->reimbursement->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $reimbursement->with($depends);
        }

        $reimbursement = $reimbursement->first();

        if (is_null($reimbursement))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $reimbursement;
    }

    public function update(Request $request)
    {

        $reimbursementAcc = $this->findById(Helpers::decodeHashedID($request->input('id')),['creator','branch','category']);

        $reimbursementAcc->note = $request->input('note');
        $reimbursementAcc->date = $request->input('date');

        $reimbursementAcc->total = $request->input('total');
        $reimbursementAcc->category_id = Helpers::decodeHashedID($request->input('category'));

        $reimbursementAcc->save();
        return $reimbursementAcc;
    }


    public function delete(string $id)
    {
        $reimbursement = $this->findById($id, []);

        // copy for reference
        $clone = $reimbursement;

        if ($reimbursement->deleted_at != null)
        {
            $reimbursement->forceDelete();
        }
        else
        {
            $reimbursement->delete();
        }

        return $clone;
    }

}
