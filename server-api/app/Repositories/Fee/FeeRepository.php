<?php

namespace Kinderm8\Repositories\Fee;

use Carbon\Carbon;
use DateTimeHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Fee;
use Kinderm8\FeeAdjusted;
use Kinderm8\Traits\UserAccessibility;

class FeeRepository implements IFeeRepository
{
    use UserAccessibility;

    private $fee;
    private $feeAdjusted;

    public function __construct(Fee $fee, FeeAdjusted $feeAdjusted)
    {
        $this->fee = $fee;
        $this->feeAdjusted = $feeAdjusted;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->fee, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @param bool $visibility
     * @return Builder[]|Collection
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed, bool $visibility = true)
    {
        $fees = $this->fee->query();

        $fees = $this->attachAccessibilityQuery($fees);

        // non admin access
        if($visibility)
        {
            $fees->when(auth()->user()->isAdministrative() && !auth()->user()->hasAdminRights(), function ($query)
                {
                    return $query->where('visibility', '=', 0);
                });
        }

        // attach relationship data
        $fees->when(!empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            });

        if($withTrashed)
        {
            $fees->withTrashed();
        }

        if(is_array($args) && !empty($args))
        {
            // relation filter mapping
            if (isset($args['relation_filter']) && is_array($args['relation_filter']) && !empty($args['relation_filter']))
            {
                foreach ($args['relation_filter'] as $key => $query_item)
                {
                    $fees->whereHas($key, function($query) use ($query_item)
                    {
                        foreach ($query_item as $item)
                        {
                            is_array($item['value'])
                                ? $query->whereIn($item['column'], $item['value'])
                                : $query->where($item['column'], $item['value']);
                        }

                        return $query;
                    });
                }
            }

            $fees
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['frequency']), function ($query) use ($args)
                {
                    return $query->where('frequency', $args['frequency']);
                })
                ->when(isset($args['fee_type']), function ($query) use ($args)
                {
                    return $query->where('fee_type', $args['fee_type']);
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
            $fees->orderBy('id', 'asc');
        }

        return $fees->get();
    }

    /**
     * @param Request $request
     * @return array
     */
    public function list(Request $request)
    {
        $feeList = [];
        $actualCount = 0;
        $displayCount = 0;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            // search text
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $feeList = $this->fee->withCount('bookings');

            // access
            $feeList = $this->attachAccessibilityQuery($feeList);

            if (!auth()->user()->hasAdminRights())
            {
                $feeList->where('visibility', '=', 0);
            }

            $actualCount = $feeList->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters) && $filters !== '0' && $filters !== '3')
                {
                    $feeList->where('status', (($filters === '1') ? '0' : '1'));
                }
            }

            //search
            if (!is_null($searchValue))
            {
                $feeList->whereLike([
                    'km8_fees.fee_name',
                    'km8_fees.net_amount'
                ], $searchValue);
            }

            $displayCount = $feeList->get()->count();

            $feeList = $feeList
                ->orderBy('id', 'desc')
                ->paginate($offset);

            // load relationships after pagination
            $feeList->load([ 'rooms', 'adjusted_past_collection', 'adjusted_future_collection' ]);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list'=> $feeList,
            'totalRecords' => $actualCount,
            'displayRecord' => $displayCount,
            'filtered' => !is_null($filters) && (isset($filters) && $filters !== '0'),
        ];
    }

    /**
     * @param $id
     * @param array $depends
     * @param bool $withTrashed
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends = [], bool $withTrashed = true)
    {
        $fee = $this->fee
            ->where('id', $id)
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            })
            ->withCount('bookings');

        // attach relationship data
        if (!empty($depends))
        {
            $fee->with($depends);
        }

        $fee = $fee->first();

        if (is_null($fee))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $fee;
    }

    /**
     * @param Request $request
     * @param array $roomIds
     * @return mixed
     */
    public function store(Request $request, array $roomIds)
    {
        $newObj = new $this->fee;
        $newObj->fee_name = $request->input('name');
        $newObj->fee_type = $request->input('type');
        $newObj->frequency = $request->input('frequency');

        $newObj->vendor_name = $request->input('vendor');
        $newObj->session_start = (! Helpers::IsNullOrEmpty($request->input('session_start'))) ? (int) $request->input('session_start') : null;
        $newObj->session_end = (! Helpers::IsNullOrEmpty($request->input('session_end'))) ? (int) $request->input('session_end') : null;
        $newObj->net_amount = $request->input('nAmount');
        $newObj->gross_amount = 0;
        $newObj->visibility = $request->input('visible');
        $newObj->adjust = '0';
        $newObj->status = '0';

        $newObj->branch_id = auth()->user()->branch_id;
        $newObj->organization_id = auth()->user()->organization_id;

        $newObj->save();

        if (!empty($roomIds))
        {
            $newObj->rooms()->sync($roomIds);
        }

        return $newObj;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param array $roomIds
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request, array $roomIds)
    {
        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('session_start'))) ? (int) $request->input('session_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('session_end'))) ? (int) $request->input('session_end') : null;

        $newObj = $this->findById($id);

        $newObj->fee_name = $request->input('name');
        $newObj->net_amount = $request->input('nAmount');
        $newObj->session_start = $session_start_time;//$request->input('sStart') ? $this->timeToMinute($request->input('sStart')) : null;
        $newObj->session_end = $session_end_time;//$request->input('sEnd') ? $this->timeToMinute($request->input('sEnd')) : null;
        $newObj->visibility = $request->input('visible');

        $newObj->update();

        $newObj->refresh();

        if (!empty($roomIds))
        {
            $newObj->rooms()->sync($roomIds);
        }
        else
        {
            $newObj->rooms()->detach();
        }

        return $newObj;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $rowObj = $this->findById($id);

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
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateStatus(string $id, Request $request)
    {
        $option = $request->input('status') == '0' ? '1' : '0';

        $newObj = $this->findById($id);

        $newObj->status = $option;
        $newObj->update();
        $newObj->refresh();

        return $newObj;
    }

    /*--------------------------------------------------------------------------------*/

    /**
     * @param string $fee_id
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function getAdjusted(string $fee_id, array $args, array $depends, Request $request, bool $withTrashed = false)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $adjusted_fees = $this->feeAdjusted
            ->where('fee_id', $fee_id)
            ->when(is_array($depends) && !empty($depends), function ($query) use ($depends)
            {
                return $query->with($depends);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            })
            ->when(!is_null($start) && !is_null($end), function ($query) use ($start, $end)
            {
                return $query->whereBetween('effective_date', [$start, $end]);
            });

        if (is_array($args) && !empty($args))
        {
            $adjusted_fees
                ->when(isset($args['date']), function ($query) use ($args)
                {
                    return $query->where('effective_date', $args['date']);
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
            $adjusted_fees->orderBy('effective_date', 'asc');
        }

        return $adjusted_fees->get();
    }

    /**
     * @param Request $request
     * @param array $depends
     * @param bool $throwable
     * @return mixed
     * @throws Exception
     */
    public function getAdjustedList(Request $request, array $depends = [], bool $throwable = false)
    {
        $adjusted_list = $this->feeAdjusted
            ->withCount('bookings')
            ->where('fee_id', Helpers::decodeHashedID($request->input('id')));

        // attach relationship data
        $adjusted_list->when(!empty($depends), function ($query) use ($depends)
        {
            return $query->with($depends);
        });

        $adjusted_list = $adjusted_list->orderBy('effective_date', 'DESC')->get();

        if ($throwable && $adjusted_list->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $adjusted_list;
    }

    /**
     * @param $id
     * @param array $depends
     * @param array $args
     * @param bool $withTrashed
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findAdjustedById($id, array $depends = [], array $args = [], bool $withTrashed = true)
    {
        $fee_adjusted = $this->feeAdjusted
            ->where('id', $id)
            ->when($withTrashed, function ($query)
            {
                $query->withTrashed();
            });

        // attach relationship data
        if (!empty($depends))
        {
            $fee_adjusted->with($depends);
        }

        if (is_array($args) && !empty($args))
        {
            $fee_adjusted
                ->when(isset($args['with_booking_count']), function ($query) use ($args)
                {
                    return $query->withCount('bookings');
                });
        }

        $fee_adjusted = $fee_adjusted->first();

        if (is_null($fee_adjusted))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $fee_adjusted;
    }

    /**
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function storeAdjustFee(Request $request)
    {
        $newObj = $this->findById(Helpers::decodeHashedID($request->input('id')));

        $adjustedRecord = new $this->feeAdjusted;

        $adjustedRecord->created_by = auth()->user()->id;
        $adjustedRecord->net_amount = $request->input('nAmount');
        $adjustedRecord->gross_amount = 0;
        $adjustedRecord->fee_id = $newObj->id;
        $adjustedRecord->effective_date = $request->input('eDate') ? $request->input('eDate') : '';
        $adjustedRecord->future_bookings_updated = (! Helpers::IsNullOrEmpty($request->input('update_bookings'))) ? filter_var($request->input('update_bookings'), FILTER_VALIDATE_BOOLEAN) : false;
        $adjustedRecord->save();

        $newObj->adjust = '1';
        $newObj->update();

        return $adjustedRecord;
    }

    /**
     * @param string $id
     * @return bool
     */
    public function deleteAdjustedFee(string $id)
    {
        $rowObj = $this->feeAdjusted->find($id);

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
     * @param string $fee_id
     * @param string $date
     * @return mixed
     */
    public function getAdjustedFeeByFeeDate(string $fee_id, string $date)
    {
        return $this->feeAdjusted
            ->where('fee_id', $fee_id)
            ->where('effective_date', '<=', DateTimeHelper::getTimezoneDatetime(Carbon::parse($date), auth()->user()->timezone))
            ->orderBy('effective_date', 'DESC')
            ->first();
    }

    /**
     * @param $time
     * @return float|int
     */
    private function timeToMinute($time)
    {
        $splitArr = explode(':', $time);

        $splitArr[0] = (int) $splitArr[0] * 60;
        $splitArr[1] = (int) $splitArr[1];
        $mins = array_sum($splitArr);

        return $mins;
    }
}
