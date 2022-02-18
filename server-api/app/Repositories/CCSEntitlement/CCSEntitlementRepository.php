<?php

namespace Kinderm8\Repositories\CCSEntitlement;

use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\CCSEntitlement;
use Kinderm8\Child;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use Log;

class CCSEntitlementRepository implements ICCSEntitlementRepository
{
    use UserAccessibility;

    private $ccs_entitlement;

    public function __construct(CCSEntitlement $ccs_entitlement)
    {
        $this->ccs_entitlement = $ccs_entitlement;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->ccs_entitlement, $method], $args);
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function list(array $args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $ccsentitlement_list = $this->ccs_entitlement
                ->with(['organization', 'branch'])
                ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_ccs_entitlements.branch_id');;

            //access
//            $ccsentitlement_list = $this->attachAccessibilityQuery($ccsentitlement_list, null, 'km8_ccs_entitlements');

            $ccsentitlement_list = $ccsentitlement_list->where('km8_ccs_entitlements.organization_id', auth()->user()->organization_id);


            //branch id is not set from filters because this is a branch wise request. set branch here
            if(!isset($filters->branch))
            $ccsentitlement_list = $ccsentitlement_list->where('branch_id', auth()->user()->branch->id);

            //get actual count
            $actualCount = $ccsentitlement_list
                ->select(['km8_ccs_entitlements.*', 'km8_organization_branch.name'])
                ->groupBy('km8_ccs_entitlements.id', 'km8_organization_branch.name')
                ->get()
                ->count();

            //filters
            if(!is_null($filters))
            {
                if(isset($filters->date) && $filters->date !== '')
                {
                    $ccsentitlement_list->where('km8_ccs_entitlements.date', '>=', $filters->date);
                }

                if(isset($filters->endDate) && $filters->endDate !== '')
                {
                    $ccsentitlement_list->where('km8_ccs_entitlements.date', '<=', $filters->endDate);
                }
                if(isset($filters->child) && $filters->child !== [] && $filters->child[0] != 'ServiceID')
                {
                    $enrolmentIDs = [];
                    $child = Child::find(Helpers::decodeHashedID($filters->child));
                    foreach($filters->child as $childIndex)
                    {
                        $child = Child::find(Helpers::decodeHashedID($childIndex));
                        if($child->active_ccs_enrolment->first())
                        {
                            array_push($enrolmentIDs,$child->active_ccs_enrolment->first()->enrolment_id);
                        }
                    }
                    $ccsentitlement_list->whereIn('km8_ccs_entitlements.enrolment_id',$enrolmentIDs);
                }

                if(isset($filters->showVariationsOnly) && $filters->showVariationsOnly !== '' && $filters->showVariationsOnly == true)
                {
                    $ccsentitlement_list->where('km8_ccs_entitlements.ccs_varied', $filters->showVariationsOnly);
                }

                if(isset($filters->includeYTDAbsenceChanges) && $filters->includeYTDAbsenceChanges !== '' && $filters->includeYTDAbsenceChanges == true)
                {
                    $ccsentitlement_list->where('km8_ccs_entitlements.absence_varied',$filters->includeYTDAbsenceChanges);
                }

                // branch filter is set manually from the site-manager
                if(isset($filters->branch) && $filters->branch !== '')
                {
                    $branchID = Helpers::decodeHashedID($filters->branch);
                    $ccsentitlement_list->where('km8_ccs_entitlements.branch_id',$branchID);
                }

            }

            // if single child enrolment entitlement history
            if($request->input('enrolmentID') && $request->input('enrolmentID') != null)
            {
                $ccsentitlement_list->where('km8_ccs_entitlements.enrolment_id',$request->input('enrolmentID'))->where('km8_ccs_entitlements.ccs_varied', true);
            }
            $actualCount = $ccsentitlement_list
                ->select(['km8_ccs_entitlements.*', 'km8_organization_branch.name'])
                ->groupBy('km8_ccs_entitlements.id', 'km8_organization_branch.name')
                ->get()
                ->count();

            //search
            if(!is_null($searchValue))
            {
                $searchList = [
                    'km8_ccs_entitlements.date',
                    'km8_ccs_entitlements.ccs_percentage',
                    'km8_ccs_entitlements.ccs_withholding_percentage',
                    'km8_ccs_entitlements.ccs_total_hours'
                ];

                if(!empty($searchList))
                {
                    $ccsentitlement_list->whereLike($searchList, $searchValue);
                }
            }

            //sorting
            if(!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            {
                /*$user_list->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );*/
            }
            else
            {
                $ccsentitlement_list->orderBy('km8_ccs_entitlements.date', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            if($request->input('report') && $request->input('report') == 'true')
            {
                // ini_set('max_execution_time', 300);
                $ccsentitlement_list = $ccsentitlement_list
                    ->select(['km8_ccs_entitlements.*', 'km8_organization_branch.name'])
                    ->groupBy('km8_organization_branch.name')->get();
            }
            else
            {
                $ccsentitlement_list = $ccsentitlement_list
                    ->select(['km8_ccs_entitlements.*', 'km8_organization_branch.name'])
                    ->groupBy('km8_organization_branch.name')
                    ->paginate($offset);
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $child_list = [];
        }

        foreach($ccsentitlement_list as $key=>$ccsEntitlement)
        {

            if($ccsEntitlement->ccs_varied == true)
            {
                $enrolmentID = $ccsEntitlement->enrolment_id;
                $previousRecord = CCSEntitlement::where('enrolment_id',$enrolmentID)->where('date', '<', $ccsEntitlement->date)->orderBy('date','DESC')->get()->first();
                $ccsentitlement_list[$key]->previous_record = $previousRecord;
            }
            else
                $ccsentitlement_list[$key]->previous_record = null;
        }

        return [
            'list' => $ccsentitlement_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $child = $this->child->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $child->with($depends);
        }

        $child = $child->first();

        if (is_null($child))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $child;
    }

    /**
     * @param $reference
     * @param array $depends
     * @param array $args
     * @return Builder[]|Collection
     */
    public function findByEnrolmentId($reference, array $depends, array $args)
    {
        $list = $this->ccs_entitlement->query();

        $list->when(is_array($reference), function ($query) use ($reference)
        {
            return $query->whereIn('enrolment_id', $reference);
        },
        function ($query) use ($reference)
        {
            return $query->where('enrolment_id', $reference);
        });

        $list->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
        {
            return $query->with($depends);
        });

        if (is_array($args) && !empty($args))
        {
            $list
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['date']), function ($query) use ($args)
                {
                    return $query->where('date', $args['date']);
                })
                ->when(isset($args['between_dates']), function ($query) use ($args)
                {
                    return $query->whereBetween('date', $args['between_dates']);
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
}
