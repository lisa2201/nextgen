<?php

namespace Kinderm8\Repositories\Category;

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
use Kinderm8\Category;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;

class CategoryRepository implements ICategoryRepository
{
    use UserAccessibility;


    private $category;

    public function __construct(Category $category)
    {
        $this->category = $category;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->category, $method], $args);
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        $catergory = $this->category
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // access
        $catergory = $this->attachAccessibilityQuery($catergory);

        if (is_array($args) && !empty($args))
        {
            $catergory
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['type']), function ($query) use ($args)
                {
                    return $query->where('type', $args['type']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $catergory->orderBy('id', 'asc');
        }

        $catergory = $catergory->get();

        return $catergory;
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
            $catergory_list = $this->category
            ->with(['creator','branch']);

            //access
            $catergory_list = $this->attachAccessibilityQuery($catergory_list);


            //get actual count
            $actualCount = $catergory_list
                ->get()
                ->count();


            //search
            if(!is_null($searchValue))
            {
                $searchList = [];
                    $searchList = [
                        'km8_categories.name',
                    ];

                if(!empty($searchList))
                {
                    $catergory_list->whereLike($searchList, $searchValue);
                }
            }

            $catergory_list->orderBy('km8_categories.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);


            $catergory_list = $catergory_list
                ->groupBy('id')
                ->paginate($offset);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $catergory_list = [];
        }

        return [
            'list' => $catergory_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    public function store(Request $request)
    {
        $catergoryAcc = new $this->category;

        $catergoryAcc->organization_id = auth()->user()->organization_id;
        $catergoryAcc->branch_id = auth()->user()->branch_id;
        $catergoryAcc->created_by = auth()->user()->id;
        $catergoryAcc->name = $request->input('name');
        $catergoryAcc->type = $request->input('type');

        $catergoryAcc->save();
        return $catergoryAcc;
    }

    public function findById($id, array $depends)
    {
        $catergory = $this->category->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $catergory->with($depends);
        }

        $catergory = $catergory->first();

        if (is_null($catergory))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $catergory;
    }

    public function update(Request $request)
    {

        $catergoryAcc = $this->findById(Helpers::decodeHashedID($request->input('id')),['creator','branch']);

        $catergoryAcc->name = $request->input('name');
        $catergoryAcc->type = $request->input('type');
        $catergoryAcc->save();

        return $catergoryAcc;
    }


    public function delete(string $id)
    {
        $catergory = $this->findById($id, []);

        // copy for reference
        $clone = $catergory;

        if ($catergory->deleted_at != null)
        {
            $catergory->forceDelete();
        }
        else
        {
            $catergory->delete();
        }

        return $clone;
    }

}
