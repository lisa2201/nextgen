<?php

namespace Kinderm8\Repositories\Booking;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Kinderm8\Booking;
use Kinderm8\Enums\BookingType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Services\DatabaseBatch\BatchContract;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use DateTimeHelper;

class BookingRepository implements IBookingRepository
{
    use UserAccessibility;

    private $sortColumnsMapMasterRoll = [
        'f_name' => 'first_name',
        'l_name' => 'last_name'
    ];

    private $booking;
    private $userTimezone;
    private $batchService;

    public function __construct(Booking $booking, BatchContract $batchService)
    {
        $this->booking = $booking;
        $this->userTimezone = auth()->check() ? auth()->user()->timezone : '';
        $this->batchService = $batchService;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->booking, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @return Builder[]|EloquentCollection
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $bookings = $this->booking
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
                return $query->whereBetween('date', [ $start, $end ]);
            });

        // access
        $bookings = $this->attachAccessibilityQuery($bookings);

        if (is_array($args) && !empty($args))
        {
            $bookings
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['children']), function ($query) use ($args)
                {
                    return $query->whereIn('child_id', $args['children']->pluck('id'));
                })
                ->when(isset($args['child']), function ($query) use ($args)
                {
                    return $query->where('child_id', $args['child']);
                })
                ->when(isset($args['room']), function ($query) use ($args)
                {
                    return $query->where('room_id', $args['room']);
                })
                ->when(isset($args['between_dates']), function ($query) use ($args)
                {
                    return $query->whereBetween('date', $args['between_dates']);
                })
                ->when(isset($args['date']), function ($query) use ($args)
                {
                    return $query->where('date', $args['date']);
                })
                ->when(isset($args['year']), function ($query) use ($args)
                {
                    return $query->whereRaw("date_part('year', date) >= '". $args['year'] . "'");
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
            $bookings->orderBy('date', 'asc');
        }

        return $bookings->get();
    }

    /**
     * @param $args
     * @param Request $request
     * @return Builder[]|Collection
     */
    public function list(array $args, Request $request)
    {
        $child_id = Helpers::decodeHashedID($request->input('id'));
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : Carbon::now($this->userTimezone)->firstOfMonth()->startOfWeek()->format('Y-m-d');
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : Carbon::now($this->userTimezone)->lastOfMonth()->endOfWeek()->format('Y-m-d');

        //filters
        $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

        // query builder
        $bookings = $this->booking->with(['child', 'room', 'fee', 'fee_adjusted', 'attendance', 'attendance.bus']);

        //access
        $bookings = $this->attachAccessibilityQuery($bookings);

        //filters
        if(!is_null($filters))
        {
            if(isset($filters->type) && $filters->type !== '')
            {
                if($filters->type !== '4')
                {
                    $bookings->where('status', $filters->type);
                }
                else
                {
                    $bookings->where('is_casual', true);
                }
            }

            if(isset($filters->attend_type) && $filters->attend_type !== '')
            {
                $bookings->whereHas('attendance', function($query) use ($filters)
                {
                    if($filters->attend_type === '0')
                    {
                        $query->whereNotNull('drop_time')->whereNotNull('pick_time');
                    }

                    if($filters->attend_type === '1')
                    {
                        $query->whereNull('pick_time');
                    }
                });
            }

            if(isset($filters->fee) && $filters->fee !== '0')
            {
                $bookings->where('fee_id', Helpers::decodeHashedID($filters->fee));
            }

            if(isset($filters->room) && $filters->room !== '0')
            {
                $bookings->where('room_id', Helpers::decodeHashedID($filters->room));
            }
        }

        return $bookings
            ->where('child_id', $child_id)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date', 'ASC')
            ->get();

    }

    /**
     * @param Request $request
     * @param string $child_room_sync_model
     * @param string $fee_adjusted_model
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function bulkStore(Request $request, string $child_room_sync_model, string $fee_adjusted_model)
    {
        $booking_slots = json_decode(json_encode($request->input('slots')));

        if (empty($booking_slots))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // generate insert list
        $insertList = [];
        $nonLinkedRooms = new Collection();
        $dateTime = Carbon::now();

        // get adjusted fee ids
        $adjusted_fee_ids = array_filter(array_values(array_unique(array_map(function($i) { return !is_null($i->adjusted_fee) ? Helpers::decodeHashedID($i->adjusted_fee) : null; }, $booking_slots))));
        $adjusted_list = !empty($adjusted_fee_ids) ? app("Kinderm8\\{$fee_adjusted_model}")->find($adjusted_fee_ids) : null;

        // generate booking insert list
        foreach ($booking_slots as $slot)
        {
            // get non linked room
            if (!in_array($slot->room, $slot->linked_rooms))
            {
                $filtered = new Collection();

                if(!$nonLinkedRooms->isEmpty())
                {
                    $filtered = $nonLinkedRooms->filter(function ($item) use ($slot)
                    {
                        return $item['child_id'] === Helpers::decodeHashedID($slot->child) && $item['room_id'] === Helpers::decodeHashedID($slot->room);
                    });
                }

                if ($filtered->isEmpty())
                {
                    $nonLinkedRooms->add([
                        'organization_id' => auth()->user()->organization_id,
                        'branch_id' =>  auth()->user()->branch_id,
                        'created_by' => auth()->user()->id,
                        'child_id' => Helpers::decodeHashedID($slot->child),
                        'room_id' => Helpers::decodeHashedID($slot->room),
                        'date' => $slot->date,
                        'updated_at' => $dateTime,
                        'created_at' => $dateTime
                    ]);
                }

                unset($filtered);
            }

            // map adjusted fee
            $adjusted_fee_id = (!is_null($adjusted_list) && !$adjusted_list->filter(function ($adjusted) use ($slot) { return $adjusted->fee_id === Helpers::decodeHashedID($slot->fee); })->isEmpty())
                ? $adjusted_list->filter(function ($adjusted) use ($slot) { return $adjusted->fee_id === Helpers::decodeHashedID($slot->fee); })->first()->id
                : null;

            $fee_amount = (!is_null($adjusted_list) && !$adjusted_list->filter(function ($adjusted) use ($slot) { return $adjusted->fee_id === Helpers::decodeHashedID($slot->fee); })->isEmpty())
                ? (float) $adjusted_list->filter(function ($adjusted) use ($slot) { return $adjusted->fee_id === Helpers::decodeHashedID($slot->fee); })->first()->net_amount
                : (float) $slot->fee_amount;

            array_push($insertList, [
                'organization_id' => auth()->user()->organization_id,
                'branch_id' =>  auth()->user()->branch_id,
                'created_by' => auth()->user()->id,
                'child_id' => Helpers::decodeHashedID($slot->child),
                'room_id' => Helpers::decodeHashedID($slot->room),
                'fee_id' => Helpers::decodeHashedID($slot->fee),
                'adjusted_fee_id' => $adjusted_fee_id,
                'date' => $slot->date,
                'day' => $slot->day,
                'fee_amount' => $fee_amount,
                'session_start' => (int) $slot->start,
                'session_end' => (int) $slot->end,
                'is_casual' => $request->input('casual'),
                'child_room_sync' => !$nonLinkedRooms->isEmpty(),
                'updated_at' => $dateTime,
                'created_at' => $dateTime
            ]);
        }

        if (!empty($insertList))
        {
            $this->booking->insert($insertList);
        }

        // insert data to future room sync
        if (!$nonLinkedRooms->isEmpty())
        {
            app("Kinderm8\\{$child_room_sync_model}")->insert($nonLinkedRooms->toArray());
        }

        return true;
    }

    /**
     * @param Request $request
     * @param Model|null $feeObject
     * @param Model|null $fee_adjusted
     * @param Model|null $childObj
     * @param $room_id
     * @param string $attendance_model
     * @return mixed
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function store(Request $request, ?Model $feeObject, ?Model $fee_adjusted, ?Model $childObj, $room_id, string $attendance_model)
    {
        $date = (! Helpers::IsNullOrEmpty($request->input('date'))) ? $request->input('date') : null;
        $absence = (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : 'NONE';

        if ($request->input('device_route'))
        {
            $session_start_time = ($request->input('hourly_start') != '') ? DateTimeHelper::convertTimeStringToMins($request->input('hourly_start')) : null;
            $session_end_time = ($request->input('hourly_end')!= '') ? DateTimeHelper::convertTimeStringToMins($request->input('hourly_end')) : null;
            $start_time = (! Helpers::IsNullOrEmpty($request->input('start_time'))) ? DateTimeHelper::convertTimeStringToMins($request->input('start_time')) : null;
            $end_time = ($request->input('end_time')!= '') ? DateTimeHelper::convertTimeStringToMins($request->input('end_time')) : null;
        }
        else
        {
            $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
            $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;
            $start_time = (! Helpers::IsNullOrEmpty($request->input('start_time'))) ? (int) $request->input('start_time') : null;
            $end_time = (! Helpers::IsNullOrEmpty($request->input('end_time'))) ? (int) $request->input('end_time') : null;
        }

        $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;

        if (is_null($childObj) || is_null($feeObject))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // get booking from database
        $getBookings = $this->booking
            ->with(['fee', 'fee_adjusted'])
            ->where('child_id', $childObj->id)
            ->where('date', $date)
            ->get()
            ->toArray();

        // validated booking slots with existing records
        if($this->isOverlapped($getBookings, [
            'start' => ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time,
            'end' => ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time
        ]))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('booking.session_overlapped'), ErrorType::CustomValidationErrorCode);
        }

        // create booking
        $booking = new $this->booking;

        $booking->organization_id = auth()->user()->organization_id;
        $booking->branch_id =  auth()->user()->branch_id;
        $booking->created_by = auth()->user()->id;
        $booking->child_id = $childObj->id;
        $booking->room_id = $room_id;
        $booking->fee_id = $feeObject->id;
        $booking->adjusted_fee_id = !is_null($fee_adjusted) ? $fee_adjusted->id : null;
        $booking->date = $date;
        $booking->day = strtolower(Carbon::parse($date)->format('l'));
        $booking->fee_amount = !is_null($fee_adjusted) ? (float) $fee_adjusted->net_amount : (float) $feeObject->net_amount;
        $booking->session_start = ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time;
        $booking->session_end = ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time;
        $booking->is_casual = true;
        $booking->absence_reason = $absence;
        $booking->status = $type;
        $booking->absence_document_held = filter_var($request->input('abs_doc_held'), FILTER_VALIDATE_BOOLEAN);

        $booking->save();

        // save attendance or absence data
        if ($type === '1' || $type === '2')
        {
            $attendanceObj = app()->make("Kinderm8\\{$attendance_model}");

            $attendanceObj->organization_id = auth()->user()->organization_id;
            $attendanceObj->branch_id =  auth()->user()->branch_id;
            $attendanceObj->child_id = $childObj->id;
            $attendanceObj->booking_id = $booking->id;
            $attendanceObj->date = $date;
            $attendanceObj->type = ($type === '2') ? '1' : '0';

            // attendance
            if($type === '1')
            {
                $attendanceObj->drop_time = $start_time;
                $attendanceObj->drop_user = auth()->user()->id;

                if(!is_null($end_time))
                {
                    $attendanceObj->pick_time = $end_time;
                    $attendanceObj->pick_user = auth()->user()->id;
                }
            }

            $attendanceObj->save();
        }

        // reload with relationships
        $booking->load(['room', 'fee', 'attendance']);

        return $booking;
    }

    /**
     * @param $id
     * @param array $depends
     * @return Builder|Model|object|null
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $booking = $this->booking->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $booking->with($depends);
        }

        $booking = $booking->first();

        if (is_null($booking))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $booking;
    }

    /**
     * @param $reference
     * @param array $args
     * @param array $depends
     * @param bool $withTrashed
     * @param Request $request
     * @param bool $distinct
     * @return mixed
     */
    public function findByBranch($reference, array $args, array $depends, bool $withTrashed, Request $request, bool $distinct = false)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $booking = $this->booking
            ->where('organization_id', auth()->user()->organization_id)
            ->when(!is_null($start) && !is_null($end), function ($query) use ($start, $end)
            {
                $query->whereBetween('date', [$start, $end]);
            });

        // attach relationship data
        if(!empty($depends))
        {
            $booking->with($depends);
        }

        if(is_array($args) && !empty($args))
        {
            // relation filter mapping
            if (isset($args['relation_filter']) && is_array($args['relation_filter']) && !empty($args['relation_filter']))
            {
                foreach ($args['relation_filter'] as $key => $query_item)
                {
                    $booking->whereHas($key, function($query) use ($query_item)
                    {
                        foreach ($query_item as $item)
                        {
                            $query->where($item['column'], $item['value']);
                        }

                        return $query;
                    });
                }
            }

            $booking
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }

        if(!is_null($reference))
        {
            $booking->when(is_array($reference) && !empty($reference), function ($query) use ($reference)
            {
                return $query->whereIn('branch_id', $reference);
            },
            function ($query) use ($reference)
            {
                return $query->where('branch_id', $reference);
            });
        }

        if($distinct)
        {
            $booking->select(DB::raw("DISTINCT ON (child_id) *"));
        }

        // deleted
        $booking->when($withTrashed, function ($query)
        {
            return $query->withTrashed();
        });

        $booking = $booking->get();

        return $booking;
    }

    /**
     * @param $reference
     * @param array $args
     * @param array $depends
     * @param bool $withTrashed
     * @param Request $request
     * @return mixed
     */
    public function findByRoom($reference, array $args, array $depends, bool $withTrashed, Request $request)
    {
        $date = (! Helpers::IsNullOrEmpty($request->input('date'))) ? $request->input('date') : null;

        $booking = $this->booking->query();

        // access
        $booking = $this->attachAccessibilityQuery($booking);

        // query
        $booking->when(!is_null($date), function ($query) use ($date)
        {
            return $query->where('date', $date);
        })
        ->when($reference instanceof EloquentCollection, function ($query) use ($reference)
        {
            return $query->whereIn('room_id', $reference->pluck('id'));
        },
        function ($query) use ($reference)
        {
            return $query->where('room_id', $reference->id);
        });

        // attach relationship data
        if(!empty($depends))
        {
            $booking->with($depends);
        }

        $booking->when($withTrashed, function ($query)
        {
            return $query->withTrashed();
        });

        if(is_array($args) && !empty($args))
        {
            $booking
                ->when(isset($args['relation_filter']) && is_array($args['relation_filter']) && !empty($args['relation_filter']), function ($query) use ($args)
                {
                    return $query->with([ $args['relation_filter']['relation'] => function ($query) use ($args)
                    {
                        return $query->where($args['relation_filter']['column'], $args['relation_filter']['value']);
                    }]);
                })
                ->when(isset($args['relation_order']) && is_array($args['relation_order']) && !empty($args['relation_order']), function ($query) use ($args)
                {
                    return $query->with([ $args['relation_order']['relation'] => function ($query) use ($args)
                    {
                        return $query->orderBy($args['relation_order']['column'], $args['relation_order']['value']);
                    }]);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }

        return $booking->get();
    }

    /**
     * @param $id
     * @param array $args
     * @param array $depends
     * @param bool $withTrashed
     * @param Request $request
     * @param bool $throwable
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findByFeeId($id, array $args, array $depends, bool $withTrashed, Request $request, bool $throwable)
    {
        $bookings = $this->booking
            ->where('fee_id', $id)
            ->when($withTrashed, function($query)
            {
                return $query->withTrashed();
            });

        // attach relationship data
        if (!empty($depends))
        {
            $bookings->with($depends);
        }

        $bookings = $bookings->get();

        if ($bookings->isEmpty() && $throwable)
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $bookings;
    }

    /**
     * @param Request $request
     * @param string $action
     * @param string $fee_model
     * @param string $fee_adjusted_model
     * @param string $attendance_model
     * @return array
     * @throws ResourceNotFoundException
     */
    public function bulkUpdate(Request $request, string $action, string $fee_model, string $fee_adjusted_model, string $attendance_model)
    {
        $operation = (! Helpers::IsNullOrEmpty($request->input('operation'))) ? $request->input('operation') : null;

        $room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;
        $child_id = (! Helpers::IsNullOrEmpty($request->input('child'))) ? Helpers::decodeHashedID($request->input('child')) : null;

        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;

        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;

        $booking_items = $request->input('slots');
        $booking_ids = array_map(function($i) { return Helpers::decodeHashedID($i['id']); }, $booking_items);
        $booking_dates = array_map(function($i) { return $i['date']; }, $booking_items);

        $removed_attendance_ids = [];

        if (empty($booking_ids))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // update
        if ($action === '0')
        {
            // remove only absence attendance records found
            if ($operation === '2')
            {
                $deleted_attendance_query = app("Kinderm8\\{$attendance_model}")
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->whereIn('date', $booking_dates)
                    ->whereIn('booking_id', $booking_ids)
                    ->where('type', '1');

                $removed_attendance_ids = array_merge($removed_attendance_ids, $deleted_attendance_query->get()->pluck('id')->toArray());

                $deleted_attendance_query->forceDelete();

                unset($deleted_attendance_query);
            }

            // room
            if ($operation === '0')
            {
                $this->booking->whereIn('id', $booking_ids)
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'room_id' => $room_id
                    ]);
            }
            // fee
            else if ($operation === '1')
            {
                $feeObject = app("Kinderm8\\{$fee_model}")->find($fee_id);

                $feeAdjustedObject = (!Helpers::IsNullOrEmpty($request->input('adjust_fee_id')))
                    ? app("Kinderm8\\{$fee_adjusted_model}")->find(Helpers::decodeHashedID($request->input('adjust_fee_id')))
                    : null;

                $this->booking->whereIn('id', $booking_ids)
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'fee_id' => $feeObject->id,
                        'adjusted_fee_id' => !is_null($feeAdjustedObject) ? $feeAdjustedObject->id : null,
                        'fee_amount' => !is_null($feeAdjustedObject) ? (float) $feeAdjustedObject->net_amount : (float) $feeObject->net_amount,
                        'session_start' => ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time,
                        'session_end' => ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time,
                        'is_casual' => $feeObject->fee_type === '1',
                    ]);
            }
            // holiday
            else if ($operation === '2')
            {
                $this->booking->whereIn('id', $booking_ids)
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'status' => 3
                    ]);
            }
            // absence
            else if ($operation === '3')
            {
                $existing_attendance_data = app("Kinderm8\\{$attendance_model}")
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->whereIn('booking_id', array_map(function ($i) { return Helpers::decodeHashedID($i['id']);}, $booking_items))
                    ->get();

                $booking_updates = [];
                $attendance_list = [];
                $attendance_update_list = [];

                $current_date = now();

                foreach ($booking_items as $value)
                {
                    // update absence reason
                    array_push($booking_updates, [
                        'id' => Helpers::decodeHashedID($value['id']),
                        'status' => 2,
                        'absence_reason' => $value['abs_reason'],
                        'absence_document_held' => filter_var($value['abs_doc_held'], FILTER_VALIDATE_BOOLEAN) ? 't' : 'f'
                    ]);

                    /*$this->booking
                        ->where('id', Helpers::decodeHashedID($value['id']))
                        ->where('child_id', $child_id)
                        ->where('organization_id', auth()->user()->organization_id)
                        ->where('branch_id', auth()->user()->branch_id)
                        ->update([
                            'status' => 2,
                            'absence_reason' => $value['abs_reason']
                        ]);*/

                    // check if absent record exists
                    $exist_absence = $existing_attendance_data->filter(function ($r) use ($value) { return $r->booking_id === Helpers::decodeHashedID($value['id']); });

                    if (!$exist_absence->isEmpty())
                    {
                        array_push($attendance_update_list, [
                            'id' => $exist_absence->first()->id,
                            'ccs_submitted' => 'false'
                        ]);

                        continue;
                    }

                    unset($exist_absence);

                    array_push($attendance_list, [
                        'organization_id' => auth()->user()->organization_id,
                        'branch_id' => auth()->user()->branch_id,
                        'child_id' => $child_id,
                        'booking_id' => Helpers::decodeHashedID($value['id']),
                        'date' => $value['date'],
                        'type' => '1',
                        'drop_user' => null,
                        'drop_time' => null,
                        'drop_geo_coordinates' => null,
                        'drop_signature' => null,
                        'drop_child_note_id' => null,
                        'pick_user' => null,
                        'pick_time' => null,
                        'pick_geo_coordinates' => null,
                        'pick_signature' => null,
                        'pick_child_note_id' => null,
                        'is_extra_day' => '0',
                        'ccs_submitted' => false,
                        'deleted_at' => null,
                        'created_at' => $current_date,
                        'updated_at' => $current_date
                    ]);
                }

                /*---------------------------------*/

                if (!empty($booking_updates))
                {
                    $this->batchService->update($this->booking, $booking_updates);
                }

                if (!empty($attendance_list))
                {
                    app("Kinderm8\\{$attendance_model}")->insert($attendance_list);
                }

                if (!empty($attendance_update_list))
                {
                    $this->batchService->update(app("Kinderm8\\{$attendance_model}"), $attendance_update_list);
                }
            }
            // change dates
            else
            {
                $booking_list = $this->booking
                    ->where('child_id', $child_id)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->whereBetween('date', [$start_date, $end_date])
                    ->whereIn('fee_id', array_values(array_map(function ($item) { return Helpers::decodeHashedID($item['fee']); }, $booking_items)))
                    ->whereIn('room_id', array_values(array_map(function ($item) { return Helpers::decodeHashedID($item['room']); }, $booking_items)))
                    ->where('status', '!=', '1') // ignore attendance
                    ->get();

                $this->booking->destroy(array_values(array_diff($booking_list->pluck('id')->toArray(), $booking_ids)));
            }
        }
        // delete
        else
        {
            $this->booking->destroy($booking_ids);
        }

        return [
            'room_update' => $room_id,
            'slots' => $booking_items,
            'removed_attendance' => $removed_attendance_ids
        ];
    }

    /**
     * @param string $id
     * @param Model|null $feeObject
     * @param Model|null $fee_adjusted
     * @param Request $request
     * @param string $attendance_model
     * @return array
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function update(string $id, ?Model $feeObject, ?Model $fee_adjusted, Request $request, string $attendance_model)
    {
        $room_id = Helpers::decodeHashedID($request->input('room'));
        $date = (! Helpers::IsNullOrEmpty($request->input('date'))) ? $request->input('date') : null;
        $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
        // $casual = (! Helpers::IsNullOrEmpty($request->input('casual'))) ? $request->input('casual') : false;
        $absence = (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : null;
        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;
        $start_time = (! Helpers::IsNullOrEmpty($request->input('start_time'))) ? (int) $request->input('start_time') : null;
        $end_time = (! Helpers::IsNullOrEmpty($request->input('end_time'))) ? (int) $request->input('end_time') : null;
        $fee_optional = (! Helpers::IsNullOrEmpty($request->input('fee_optional'))) ? filter_var($request->input('fee_optional'), FILTER_VALIDATE_BOOLEAN) : false;

        $update_fee_adjust = false;
        $added_attendance_id = null;
        $removed_attendance_id = null;

        // fee validation
        if (!$fee_optional && is_null($feeObject))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // get bookings
        $rowObj = $this->findById($id, []);

        // get booking from database (other booking for particular date)
        $getBookings = $this->booking
            ->with('fee')
            ->where('child_id', $rowObj->child_id)
            ->where('id', '!=', $rowObj->id)
            ->where('date', $date)
            ->get()
            ->toArray();

        // validated booking slots with existing records
        if (!is_null($feeObject) && $this->isOverlapped($getBookings, [
            'start' => ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time,
            'end' => ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time
        ]))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('booking.session_overlapped'), ErrorType::CustomValidationErrorCode);
        }

        // check if fee found
        if ($feeObject)
        {
            // update booking - fee changed
            if ($rowObj->fee_id !== $feeObject->id)
            {
                $rowObj->fee_id = $feeObject->id;
                $rowObj->fee_amount = (float) $feeObject->net_amount;
                $rowObj->session_start = ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time;
                $rowObj->session_end = ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time;

                $update_fee_adjust = true;
            }
            else
            {
                if (!is_null($fee_adjusted) && (is_null($rowObj->adjusted_fee_id) || $rowObj->adjusted_fee_id !== $fee_adjusted->id))
                {
                    //\Log::info(is_null($rowObj->adjusted_fee_id) ? 'fee adjusted not found' : 'fee adjusted found & new adjusted id');
                    $update_fee_adjust = true;
                }
                else
                {
                    //\Log::info(is_null($fee_adjusted) ? 'fee adjust null' : 'fee adjusted found & same adjusted id');
                }

                // update time if hourly basics
                if ($feeObject->frequency === '1')
                {
                    $rowObj->session_start = $session_start_time;
                    $rowObj->session_end = $session_end_time;
                }
            }
        }

        // update adjusted fee change
        if ($update_fee_adjust)
        {
            $rowObj->adjusted_fee_id = !is_null($fee_adjusted) ? $fee_adjusted->id : null;
            $rowObj->fee_amount = !is_null($fee_adjusted) ? (float) $fee_adjusted->net_amount : (float) $feeObject->net_amount;
        }

        // room change
        if ($rowObj->room_id !== $room_id)
        {
            $rowObj->room_id = $room_id;
        }

        $rowObj->status = $type;
        $rowObj->absence_reason = ($type !== '2') ? array_key_first(CCSType::BOOKING_ABSENCE_REASON) : $absence;
        $rowObj->absence_document_held = filter_var($request->input('abs_doc_held'), FILTER_VALIDATE_BOOLEAN);
        //$rowObj->is_casual = ($feeObject->fee_type === '1');

        $rowObj->update();

        // update or delete only attendance
        $attendanceObj = app("Kinderm8\\{$attendance_model}")
            ->withTrashed()
            ->where('booking_id', $rowObj->id)
            ->where('date', $date)
            ->get()
            ->first();

        if (!is_null($attendanceObj))
        {
            // attendance or absence
            if ($type === '1' || $type === '2')
            {
                $attendanceObj->ccs_submitted = false;
                $attendanceObj->type = ($type === '1') ? '0' : '1';

                // attendance
                if ($type === '1')
                {
                    $attendanceObj->drop_time = $start_time;

                    if (is_null($attendanceObj->drop_user))
                    {
                        $attendanceObj->drop_user = auth()->user()->id;
                    }

                    if (!is_null($end_time))
                    {
                        $attendanceObj->pick_time = $end_time;
                        $attendanceObj->pick_user = auth()->user()->id;
                    }
                    else
                    {
                        $attendanceObj->pick_time = null;
                        $attendanceObj->pick_user = null;
                    }

                    $added_attendance_id = $attendanceObj->id;
                }
                // absence
                else
                {
                    $attendanceObj->drop_time = null;
                    $attendanceObj->drop_user = null;
                    $attendanceObj->drop_geo_coordinates = null;
                    $attendanceObj->drop_signature = null;
                    $attendanceObj->drop_child_note_id = null;

                    $attendanceObj->pick_time = null;
                    $attendanceObj->pick_user = null;
                    $attendanceObj->pick_geo_coordinates = null;
                    $attendanceObj->pick_signature = null;
                    $attendanceObj->pick_child_note_id = null;

                    $removed_attendance_id = $attendanceObj->id;
                }

                $attendanceObj->update();
            }
            else
            {
                $removed_attendance_id = $attendanceObj->id;

                $attendanceObj->forceDelete();
            }
        }
        else
        {
            // attendance or absence
            if ($type === '1' || $type === '2')
            {
                $attendanceObj = app()->make("Kinderm8\\{$attendance_model}");

                $attendanceObj->organization_id = auth()->user()->organization_id;
                $attendanceObj->branch_id =  auth()->user()->branch_id;
                $attendanceObj->child_id = $rowObj->child_id;
                $attendanceObj->booking_id = $rowObj->id;
                $attendanceObj->date = $date;
                $attendanceObj->type = ($type === '2') ? '1' : '0';

                // attendance
                if ($type === '1')
                {
                    $attendanceObj->drop_time = $start_time;

                    if (is_null($attendanceObj->drop_user))
                    {
                        $attendanceObj->drop_user = auth()->user()->id;
                    }

                    if (!is_null($end_time))
                    {
                        $attendanceObj->pick_time = $end_time;
                        $attendanceObj->pick_user = auth()->user()->id;
                    }
                }

                $attendanceObj->save();

                $added_attendance_id = ($type === '1') ? $attendanceObj->id : null;
            }
        }

        // reload with relationships
        $rowObj->load(['room', 'fee', 'attendance']);

        return [
            'object' => $rowObj,
            'added_attendance' => $added_attendance_id,
            'removed_attendance' => $removed_attendance_id
        ];
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $attendance_model
     * @return array
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     */
    public function updateType(string $id, Request $request, string $attendance_model)
    {
        $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
        $absence = (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : null;
        $start_time = (! Helpers::IsNullOrEmpty($request->input('start_time'))) ? (int) $request->input('start_time') : null;
        $end_time = (! Helpers::IsNullOrEmpty($request->input('end_time'))) ? (int) $request->input('end_time') : null;

        $added_attendance_id = null;
        $removed_attendance_id = null;

        $rowObj = $this->findById($id, []);

        $rowObj->status = $type;
        $rowObj->absence_reason = ($type !== '2') ? array_key_first(CCSType::BOOKING_ABSENCE_REASON) : $absence;
        $rowObj->absence_document_held = filter_var($request->input('abs_doc_held'), FILTER_VALIDATE_BOOLEAN);

        $rowObj->update();

        // update or delete only attendance
        $attendanceObj = app("Kinderm8\\{$attendance_model}")
            ->withTrashed()
            ->where('booking_id', $rowObj->id)
            ->where('date', $rowObj->date)
            ->get()
            ->first();

        if (!is_null($attendanceObj))
        {
            // attendance or absence
            if($type === '1' || $type === '2')
            {
                $attendanceObj->ccs_submitted = false;
                $attendanceObj->type = ($type === '1') ? '0' : '1';

                // attendance
                if($type === '1')
                {
                    $attendanceObj->drop_time = $start_time;
                    $attendanceObj->drop_user = auth()->user()->id;

                    if(!is_null($end_time))
                    {
                        $attendanceObj->pick_time = $end_time;
                        $attendanceObj->pick_user = auth()->user()->id;
                    }
                }
                // absence
                else
                {
                    $attendanceObj->drop_time = null;
                    $attendanceObj->drop_user = null;
                    $attendanceObj->drop_geo_coordinates = null;
                    $attendanceObj->drop_signature = null;
                    $attendanceObj->drop_child_note_id = null;

                    $attendanceObj->pick_time = null;
                    $attendanceObj->pick_user = null;
                    $attendanceObj->pick_geo_coordinates = null;
                    $attendanceObj->pick_signature = null;
                    $attendanceObj->pick_child_note_id = null;
                }

                $attendanceObj->save();
            }
            else
            {
                $removed_attendance_id = $attendanceObj->id;

                $attendanceObj->forceDelete();
            }
        }
        else
        {
            // attendance or absence
            if($type === '1' || $type === '2')
            {
                $attendanceObj = app()->make("Kinderm8\\{$attendance_model}");

                $attendanceObj->organization_id = auth()->user()->organization_id;
                $attendanceObj->branch_id =  auth()->user()->branch_id;
                $attendanceObj->child_id = $rowObj->child_id;
                $attendanceObj->booking_id = $rowObj->id;
                $attendanceObj->date = $rowObj->date;
                $attendanceObj->type = ($type === '2') ? '1' : '0';

                // attendance
                if($type === '1')
                {
                    $attendanceObj->drop_time = $start_time;
                    $attendanceObj->drop_user = auth()->user()->id;

                    if(!is_null($end_time))
                    {
                        $attendanceObj->pick_time = $end_time;
                        $attendanceObj->pick_user = auth()->user()->id;
                    }

                    $added_attendance_id = $attendanceObj->id;
                }

                $attendanceObj->save();
            }
        }

        // reload with relationships
        $rowObj->load(['room', 'fee', 'attendance']);

        return [
            'object' => $rowObj,
            'added_attendance' => $added_attendance_id,
            'removed_attendance' => $removed_attendance_id
        ];
    }

    /**
     * @param string $id
     * @return Builder|Model|object
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $rowObj = $this->findById($id, ['attendance']);

        if ($rowObj->deleted_at != null)
        {
            $rowObj->forceDelete();
        }
        else
        {
            $rowObj->delete();
        }

        return $rowObj;
    }

    /**
     * @param Model|null $childObj
     * @param Request $request
     * @return array
     */
    public function getPreviewSlots(?Model $childObj, Request $request)
    {
        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;
        $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
        $slots = $request->input('slots');
        $date_list = [];

        // get booking from database
        $getBookings = ($type === '0')
            ? $this->booking->where('date', $start_date)
            : $this->booking->whereBetween('date', [$start_date, $end_date]);

        // access
        $getBookings = $this->attachAccessibilityQuery($getBookings);

        $getBookings = $getBookings
            ->where('child_id', $childObj->id)
            ->get()
            ->toArray();

        if ($type === '0') // casual
        {
            foreach ($slots as $slot)
            {
                array_push($date_list, array_merge([
                    'child' => new ChildResource($childObj, [ 'basic' => true, 'withRooms' => true ]),
                    'date' => $start_date,
                    'day' => strtolower(Carbon::parse($start_date)->format('l')),
                    'selected' => false,
                    'disabled' => false
                ], $slot));
            }
        }
        else if ($type === '1') // weekly
        {
            $period = CarbonPeriod::create($start_date, $end_date);

            $date_list = $this->generateSlots($period, $slots, $childObj);
        }
        else // alternative week
        {
            $period = CarbonPeriod::create($start_date, '1 week', $end_date)->toArray();

            for ($i = 0; $i < count($period); $i++)
            {
                if($i % 2 !== 0)
                {
                    continue;
                }

                $period_week = null;

                $period_week = ($i === count($period) - 1)
                    ? CarbonPeriod::create($period[$i]->format('Y-m-d'), $end_date)
                    : CarbonPeriod::create($period[$i]->format('Y-m-d'), $period[$i + 1]->subDays(1)->format('Y-m-d'));

                if(!empty($period_week))
                {
                    $date_list = array_merge($date_list, $this->generateSlots($period_week, $slots, $childObj));
                }
            }
        }

        // validate date list
        foreach ($date_list as &$item)
        {
            $dbData = array_values(array_filter(
                $getBookings,
                function ($e) use (&$item)
                {
                    return $item['date'] === $e['date'] && $item['child']->id === $e['child_id'];
                }
            ));

            if(!empty($dbData))
            {
                foreach ($dbData as $el)
                {
                    if($item['start'] < $el['session_end'] && $el['session_start'] < $item['end'])
                    {
                        $item['disabled'] = true;

                        break;
                    }
                }
            }
        }

        return $date_list;
    }

    /**
     * @param Model|null $childObj
     * @param Request $request
     * @param string $room_model
     * @param string $fee_model
     * @return array
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function getBookingsPreviewSlots(?Model $childObj, Request $request, string $room_model, string $fee_model)
    {
        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;
        $action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;
        $operation = (! Helpers::IsNullOrEmpty($request->input('operation'))) ? $request->input('operation') : null;
        $room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;
        $adjust_fee_id = (! Helpers::IsNullOrEmpty($request->input('adjust_fee_id'))) ? Helpers::decodeHashedID($request->input('adjust_fee_id')) : null;
        $summary_filters = ($request->input('summary_filter') !== '') ? json_decode(json_encode($request->input('summary_filter'))) : null;
        $days = $request->input('days');

        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;

        $feeObject = null;

        // get booking from database
        $getBookings = $this->booking
            ->with(['room', 'fee', 'fee_adjusted'])
            ->where('child_id', $childObj->id)
            ->whereBetween('date', [$start_date, $end_date])
            ->whereIn('day', $days);

        // access
        $getBookings = $this->attachAccessibilityQuery($getBookings);

        // edit action and validate
        if ($action === '0')
        {
            // room
            if ($operation === '0' && is_null(app("Kinderm8\\{$room_model}")->find($room_id)))
            {
                throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
            }

            // fee
            if ($operation === '1')
            {
                $feeObject = app("Kinderm8\\{$fee_model}")->find($fee_id);

                if (is_null($feeObject))
                {
                    throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
                }
            }
        }

        // delete action and summery filter
        if ($action === '1' && !is_null($summary_filters))
        {
            if (isset($summary_filters->rooms) && is_array($summary_filters->rooms) && !empty($summary_filters->rooms))
            {
                $getBookings->whereHas('room', function ($query) use ($summary_filters)
                {
                    $query->whereIn('id', Helpers::decodeHashedID($summary_filters->rooms));
                });
            }

            if (isset($summary_filters->fees) && is_array($summary_filters->fees) && !empty($summary_filters->fees))
            {
                $getBookings->whereHas('fee', function ($query) use ($summary_filters)
                {
                    $query->whereIn('id', Helpers::decodeHashedID($summary_filters->fees));
                });
            }
        }

        $getBookings = $getBookings
            ->orderBy('date', 'ASC')
            ->orderBy('session_start', 'ASC')
            ->get();

        // check if booking exists
        if ($getBookings->count() < 1)
        {
            throw new Exception(LocalizationHelper::getTranslatedText('booking.slots_not_available'), ErrorType::CustomValidationErrorCode);
        }

        return $this->formatPreviewItems(
            Helpers::array_group_by($getBookings->toArray(), 'date'),
            $childObj,
            $action,
            $operation,
            $request,
            $feeObject,
            $adjust_fee_id
        );
    }

    /**
     * @param $reference
     * @param Request $request
     * @return Builder[]|EloquentCollection
     */
    public function getBulkBookingAttendancePreview($reference, Request $request)
    {
        $start_date = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        // get booking from database
        $getBookings = $this->booking
            ->with(['child', 'room', 'fee', 'fee_adjusted', 'attendance'])
            ->when(is_array($reference), function($query) use ($reference)
            {
                return $query->whereIn('child_id', $reference);
            },
            function($query) use ($reference)
            {
                return $query->where('child_id', $reference);
            })
            ->when(!is_null($end_date), function($query) use ($start_date, $end_date)
            {
                return $query->whereBetween('date', [$start_date, $end_date]);
            },
            function($query) use ($start_date)
            {
                return $query->where('date', $start_date);
            });

        // access
        $getBookings = $this->attachAccessibilityQuery($getBookings);

        // clone query builder
        $getIncompleteAttendance = clone $getBookings;

        // get only bookings
        $getBookings->where('status', '0');

        // get only incomplete attendance
        $getIncompleteAttendance
            ->where('status', '1')
            ->whereHas('attendance', function ($query)
            {
                return $query
                    ->whereNull('pick_user')
                    ->whereNull('pick_time');
            });

        return $getBookings
            ->union($getIncompleteAttendance)
            ->orderBy('date', 'ASC')
            ->get();
    }

    /**
     * @param Request $request
     * @param Model $branch
     * @param Model $user
     * @return bool
     */
    public function migrate(Request $request, Model $branch, Model $user)
    {
        $insertList = [];
        $dateTime = Carbon::now();

        foreach ($request->input('list') as $item)
        {
            foreach ($item['dates'] as $date)
            {
                array_push($insertList, [
                    'organization_id' => $branch->organization_id,
                    'branch_id' =>  $branch->id,
                    'created_by' => $user->id,
                    'child_id' => Helpers::decodeHashedID($item['child']),
                    'room_id' => Helpers::decodeHashedID($item['room']),
                    'fee_id' => Helpers::decodeHashedID($item['fee']),
                    'date' => $date,
                    'day' => strtolower(Carbon::parse($date)->format('l')),
                    'fee_amount' => (float) $item['fee_amount'],
                    'session_start' => (int) $item['session_start'],
                    'session_end' => (int) $item['session_end'],
                    'updated_at' => $dateTime,
                    'created_at' => $dateTime
                ]);
            }
        }

        if(!empty($insertList))
        {
            foreach (array_chunk($insertList, 100) as $item)
            {
                $this->booking->insert($item);
            }
        }

        return true;
    }

    /**
     * @param Collection|null $children
     * @param array $rooms
     * @param array $slots
     * @param $update_room
     * @param string $child_room_sync_model
     */
    public function updateChildRoomSync(?Collection $children, array $rooms, array $slots, $update_room, string $child_room_sync_model)
    {
        $list = $this->booking
            ->whereIn('child_id', $children->pluck('id')->toArray())
            ->whereIn('room_id', $rooms)
            ->where('child_room_sync', true)
            ->get();

        $filtered_children = [];

        if (!$list->isEmpty())
        {
            foreach ($children as $child)
            {
                $check = $list->filter(function ($item) use ($rooms, $child) { return $item->child_id === $child->id && in_array($item->room_id, $rooms); })->isEmpty();

                if ($check) array_push($filtered_children, $child->id);
            }
        }
        else
        {
            $filtered_children = $children->pluck('id')->toArray();
        }

        if (!empty($filtered_children))
        {
            app("Kinderm8\\{$child_room_sync_model}")
                ->where('organization_id', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id)
                ->whereIn('child_id', $filtered_children)
                ->whereIn('room_id', $rooms)
                ->delete();
        }

        $booking_update_list = [];
        $booking_update_future_list = [];

        // update if there is any room update
        if (!is_null($update_room))
        {
            $sync_list = app("Kinderm8\\{$child_room_sync_model}")
                ->where('organization_id', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id)
                ->whereIn('child_id', $children->pluck('id')->toArray())
                ->whereIn('room_id', $rooms)
                ->get();

            $insert_list = [];
            $dateTime = Carbon::now();

            foreach ($slots as &$slot)
            {
                $slot['id'] = Helpers::decodeHashedID($slot['id']);
                $slot['child'] = Helpers::decodeHashedID($slot['child']);
                $slot['room'] = Helpers::decodeHashedID($slot['room']);

                $hasRoomLinked = !$children->filter(function ($c) use ($slot, $update_room)
                {
                    return $c->id === $slot['child'] && in_array($update_room, $c->rooms->map(function($r) { return $r->id; })->toArray());
                })->isEmpty();

                if (!$hasRoomLinked && !$slot['is_future'])
                {
                    array_push($booking_update_future_list, $slot['id']);
                }

                if (count(array_filter($insert_list, function ($i) use ($update_room, $slot) { return $i['child_id'] === $slot['child'] && $i['room_id'] === $update_room; })) > 0 || $hasRoomLinked)
                {
                    if ($hasRoomLinked && $slot['is_future']) array_push($booking_update_list, $slot['id']);

                    continue;
                }

                $sync_data = $sync_list->filter(function ($item) use ($slot)
                {
                    return $item->date === $slot['date'] && $item->child_id === $slot['child'];
                });

                if ($sync_data->isEmpty())
                {
                    array_push($insert_list, [
                        'organization_id' => auth()->user()->organization_id,
                        'branch_id' =>  auth()->user()->branch_id,
                        'created_by' => auth()->user()->id,
                        'date' => $slot['date'],
                        'child_id' => $slot['child'],
                        'room_id' => $update_room,
                        'updated_at' => $dateTime,
                        'created_at' => $dateTime
                    ]);
                }
            }

            if (!empty($insert_list))
            {
                app("Kinderm8\\{$child_room_sync_model}")->insert($insert_list);
            }
        }

        // update if booking room sync
        if (!empty($booking_update_list) || !empty($booking_update_future_list))
        {
            $query = $this->booking
                ->where('organization_id', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id);

            if (!empty($booking_update_future_list))
            {
                $query
                    ->whereIn('id', $booking_update_future_list)
                    ->update([
                        'child_room_sync' => true
                    ]);
            }
            else
            {
                $query
                    ->whereIn('id', $booking_update_list)
                    ->update([
                        'child_room_sync' => false
                    ]);
            }
        }
    }

    /**
     * @param array $children
     * @param array $rooms
     * @param string $child_room_sync_model
     */
    public function deleteChildRoomSync(array $children, array $rooms, string $child_room_sync_model)
    {
        $list = $this->booking
            ->whereIn('child_id', $children)
            ->whereIn('room_id', $rooms)
            ->where('child_room_sync', true)
            ->get();

        $filtered_children = [];

        if (!$list->isEmpty())
        {
            foreach ($children as $child)
            {
                $check = $list->filter(function ($item) use ($rooms, $child) { return $item->child_id === $child && in_array($item->room_id, $rooms); })->isEmpty();

                if ($check) array_push($filtered_children, $child);
            }
        }
        else
        {
            $filtered_children = $children;
        }

        if (!empty($filtered_children))
        {
            app("Kinderm8\\{$child_room_sync_model}")
                ->where('organization_id', auth()->user()->organization_id)
                ->where('branch_id', auth()->user()->branch_id)
                ->whereIn('child_id', $filtered_children)
                ->whereIn('room_id', $rooms)
                ->delete();
        }
    }

    /**
     * @param Model $feeAdjusted
     */
    public function updateFees(Model $feeAdjusted)
    {
        $query = $this->booking
            ->where('fee_id', $feeAdjusted->fee_id)
            ->where('date', '>=', $feeAdjusted->effective_date);

        // access
        $query = $this->attachAccessibilityQuery($query);

        $query->update([
            'fee_amount' => $feeAdjusted->net_amount,
            'adjusted_fee_id' => $feeAdjusted->id
        ]);
    }

    /**
     * check if fee session overlapped
     * @param $getBookings
     * @param $feeObject
     * @return bool
     */
    public function isOverlapped(array $getBookings, $feeObject)
    {
        $overlapped = false;

        if(!empty($getBookings))
        {
            foreach ($getBookings as $el)
            {
                if($feeObject['start'] < $el['session_end'] && $el['session_start'] < $feeObject['end'])
                {
                    $overlapped = true;
                    break;
                }
            }
        }

        return $overlapped;
    }

    /**
     * generate booking slots
     * @param $period
     * @param $slots
     * @param $childObj
     * @return array
     */
    private function generateSlots($period, $slots, $childObj)
    {
        $date_list = [];

        foreach ($period as $date)
        {
            $neededObject = array_values(array_filter(
                $slots,
                function ($e) use (&$date)
                {
                    return $e['day'] === strtolower($date->format('l'));
                }
            ));

            if (count($neededObject) > 0)
            {
                foreach ($neededObject[0]['values'] as $item)
                {
                    array_push($date_list, array_merge([
                        'child' => new ChildResource($childObj, [ 'basic' => true, 'withRooms' => true ]),
                        'date' => $date->format('Y-m-d'),
                        'day' => strtolower($date->format('l')),
                        'selected' => false,
                        'disabled' => false
                    ], $item));
                }
            }
        }

        return $date_list;
    }

    /**
     * @param array $groupedData
     * @param Model|null $child
     * @param $action
     * @param $operation
     * @param $request
     * @param $feeObject
     * @param null $adjustFeeId
     * @return array
     */
    private function formatPreviewItems(array $groupedData, ?Model $child, $action, $operation, $request, $feeObject, $adjustFeeId = null)
    {
        $dateList = [];

        if (!empty($groupedData))
        {
            foreach ($groupedData as $items)
            {
                foreach ($items as $item)
                {
                    $temp = [
                        'id' => $item['index'],
                        'child' => new ChildResource($child, [ 'basic' => true ]),
                        'date' => $item['date'],
                        'day' => strtolower($item['day']),
                        'room' => $item['room']['index'],
                        'fee' => $item['fee']['index'],
                        'fee_adjusted' => $item['fee_adjusted'] ? [
                            'index' => $item['fee_adjusted']['index'],
                            'amount' => $item['fee_adjusted']['net_amount'],
                            'effective_on' => $item['fee_adjusted']['effective_date']
                        ] : null,
                        'status' => BookingType::STATUS_MAP[$item['status']],
                        'casual' => $item['is_casual'],
                        'ab_code' => (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : null,
                        'abs_doc_held' => (! Helpers::IsNullOrEmpty($request->input('abs_doc_held'))) ? filter_var($request->input('abs_doc_held'), FILTER_VALIDATE_BOOLEAN) : false,
                        'start' => $item['session_start'],
                        'end' => $item['session_end'],
                        'is_future' => $item['child_room_sync'],
                        'selected' => false,
                        'disabled' => false,
                        'updated' => false,
                        'filtered' => false
                    ];

                    /*if($operation === '1')
                    {
                        $temp['start'] = $feeObject->frequency === '0' && is_null($session_start_time) ? $item['fee']['session_start'] : $session_start_time;
                        $temp['end'] = $feeObject->frequency === '0' && is_null($session_start_time) ? $item['fee']['session_end'] : $session_end_time;
                    }*/

                    // ignore attended
                    if ($item['status'] === '1')
                    {
                        $temp['disabled'] = true;
                    }

                    // room change - ignore same room
                    if ($action === '0' && $operation === '0' && $request->input('room') === $item['room']['index'])
                    {
                        $temp['disabled'] = true;
                        $temp['updated'] = true;
                    }

                    // fee change
                    if ($action === '0' && $operation === '1')
                    {
                        // ignore same fee
                        if ($feeObject->index === $item['fee']['index'] && count($items) === 1)
                        {
                            if (is_null($adjustFeeId) || (!is_null($item['adjusted_fee_id']) && $item['adjusted_fee_id'] === $adjustFeeId))
                            {
                                $temp['disabled'] = true;
                                $temp['updated'] = true;
                            }
                        }

                        // ignore if multiple booking found for same date (multiple sessions)
                        if (count($items) > 1)
                        {
                            $temp['disabled'] = true;
                        }
                    }

                    // holiday change - ignore same
                    if ($action === '0' && $operation === '2' && $item['status'] === '3')
                    {
                        $temp['disabled'] = true;
                        $temp['updated'] = true;
                    }

                    // absence change - ignore same
                    /*if($action === '0' && $operation === '3' && $item['status'] === '2' && $item['absence_reason'] === $abs_reason)
                    {
                        $temp['disabled'] = true;
                        $temp['updated'] = true;
                    }*/

                    array_push($dateList, $temp);
                }
            }
        }

        return $dateList;
    }

    /*-------------------------------------------------------------------------*/
    /*----------------------- Master Roll -----------------------------*/
    /*-------------------------------------------------------------------------*/

    /**
     * @param $args
     * @param Request $request
     * @return Builder[]|EloquentCollection
     */
    public function masterRollList(array $args, Request $request)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : Carbon::now($this->userTimezone)->startOfWeek()->format('Y-m-d');
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : Carbon::now($this->userTimezone)->endOfWeek()->format('Y-m-d');

        //filters
        $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

        // query builder
        $bookings = $this->booking
            ->with(['child', 'room', 'fee', 'fee_adjusted', 'attendance', 'attendance.bus'])
            ->whereHas('child', function($query) use($filters)
            {
                 if (!is_null($filters) && isset($filters->showInactive) && $filters->showInactive)
                 {
                     $query->whereNull('deleted_at');
                 }
                 else
                 {
                     $query->where('status', '1')->whereNull('deleted_at');
                 }
            });

        //access
        $bookings = $this->attachAccessibilityQuery($bookings);

        //filters
        if (!is_null($filters))
        {
            if (isset($filters->type) && $filters->type !== '')
            {
                if ($filters->type !== '4')
                {
                    $bookings->where('status', $filters->type);
                }
                else
                {
                    $bookings->where('is_casual', true);
                }
            }

            if (isset($filters->type) && $filters->type === '1' && isset($filters->attend_type) && $filters->attend_type !== '')
            {
                $bookings->whereHas('attendance', function($query) use ($filters)
                {
                    if ($filters->attend_type === '0')
                    {
                        $query->whereNotNull('drop_time')->whereNotNull('pick_time');
                    }

                    if ($filters->attend_type === '1')
                    {
                        $query->whereNull('pick_time');
                    }
                });
            }

            if (isset($filters->child) && $filters->child !== '0')
            {
                $bookings->where('child_id', Helpers::decodeHashedID($filters->child));
            }

            if (isset($filters->fee) && $filters->fee !== '0')
            {
                $bookings->where('fee_id', Helpers::decodeHashedID($filters->fee));
            }

            if (isset($filters->room) && $filters->room !== '0')
            {
                $bookings->where('room_id', Helpers::decodeHashedID($filters->room));
            }
        }

        return $bookings
            ->whereBetween('date', [$start, $end])
            ->orderBy('date', 'ASC')
            ->get();
    }

    /**
     * @param Request $request
     * @param Collection|null $child_list
     * @param string $action
     * @param string $fee_model
     * @param string $fee_adjusted_model
     * @param string $attendance_model
     * @return array
     * @throws ResourceNotFoundException
     */
    public function masterRollBulkUpdate(Request $request, ?Collection $child_list, string $action, string $fee_model, string $fee_adjusted_model, string $attendance_model)
    {
        $operation = (! Helpers::IsNullOrEmpty($request->input('operation'))) ? $request->input('operation') : null;

        $room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;

        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;

        $booking_items = $request->input('slots');
        $booking_ids = array_map(function($i) { return Helpers::decodeHashedID($i['id']); }, $booking_items);
        $has_future_bookings = !empty(array_filter($booking_items, function ($i) { return $i['is_future']; }));

        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;

        $removed_attendance_ids = [];

        if (empty($booking_ids))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        // update
        if ($action === '0')
        {
            // remove absence attendance records found
            if ($operation === '2')
            {
                $child_list->each(function ($child) use ($attendance_model, $booking_items, &$removed_attendance_ids)
                {
                    $booking_ids = array_map(
                        function($i) use ($booking_items) { return Helpers::decodeHashedID($i['id']); },
                        array_filter($booking_items, function ($i) use ($child) { return Helpers::decodeHashedID($i['child']) === $child->id; })
                    );

                    $deleted_attendance_query = app("Kinderm8\\{$attendance_model}")
                        ->where('child_id', $child->id)
                        ->where('organization_id', auth()->user()->organization_id)
                        ->where('branch_id', auth()->user()->branch_id)
                        ->whereIn('booking_id', $booking_ids)
                        ->where('type', '1');

                    $removed_attendance_ids = array_merge($removed_attendance_ids, $deleted_attendance_query->get()->pluck('id')->toArray());

                    $deleted_attendance_query->forceDelete();

                    unset($deleted_attendance_query);
                });
            }

            // room
            if ($operation === '0')
            {
                $this->booking->whereIn('id', $booking_ids)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'room_id' => $room_id
                    ]);
            }
            // fee
            else if ($operation === '1')
            {
                $feeObject = app("Kinderm8\\{$fee_model}")->find($fee_id);

                $feeAdjustedObject = (!Helpers::IsNullOrEmpty($request->input('adjust_fee_id')))
                    ? app("Kinderm8\\{$fee_adjusted_model}")->find(Helpers::decodeHashedID($request->input('adjust_fee_id')))
                    : null;

                $this->booking->whereIn('id', $booking_ids)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'fee_id' => $feeObject->id,
                        'adjusted_fee_id' => !is_null($feeAdjustedObject) ? $feeAdjustedObject->id : null,
                        'fee_amount' => !is_null($feeAdjustedObject) ? (float) $feeAdjustedObject->net_amount : (float) $feeObject->net_amount,
                        'session_start' => ($feeObject->frequency === '0' && is_null($session_start_time)) ? $feeObject->session_start : $session_start_time,
                        'session_end' => ($feeObject->frequency === '0' && is_null($session_end_time)) ? $feeObject->session_end : $session_end_time,
                        'is_casual' => $feeObject->fee_type === '1'
                    ]);
            }
            // holiday
            else if ($operation === '2')
            {
                $this->booking->whereIn('id', $booking_ids)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->update([
                        'status' => 3
                    ]);
            }
            // absence
            else if ($operation === '3')
            {
                $existing_attendance_data = app("Kinderm8\\{$attendance_model}")
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->whereIn('booking_id', array_map(function ($i) { return Helpers::decodeHashedID($i['id']);}, $booking_items))
                    ->get();

                $booking_updates = [];
                $attendance_list = [];
                $attendance_update_list = [];

                $current_date = now();

                $child_list->each(function ($child) use ($attendance_model, $booking_items, $current_date, &$attendance_list, $existing_attendance_data, &$attendance_update_list, &$booking_updates)
                {
                    // get by child
                    $filteredList = array_filter($booking_items, function ($i) use ($child) { return Helpers::decodeHashedID($i['child']) === $child->id; });

                    foreach ($filteredList as $value)
                    {
                        // update absence reason
                        array_push($booking_updates, [
                            'id' => Helpers::decodeHashedID($value['id']),
                            'status' => 2,
                            'absence_reason' => $value['abs_reason'],
                            'absence_document_held' => filter_var($value['abs_doc_held'], FILTER_VALIDATE_BOOLEAN) ? 't' : 'f'
                        ]);

                        // check if absent record exists
                        $exist_absence = $existing_attendance_data->filter(function ($r) use ($value) { return $r->booking_id === Helpers::decodeHashedID($value['id']) && $r->child_id === Helpers::decodeHashedID($value['child']); });

                        if (!$exist_absence->isEmpty())
                        {
                            array_push($attendance_update_list, [
                                'id' => $exist_absence->first()->id,
                                'ccs_submitted' => 'false'
                            ]);

                            continue;
                        }

                        unset($exist_absence);

                        // prepare attendance list
                        array_push($attendance_list, [
                            'organization_id' => auth()->user()->organization_id,
                            'branch_id' => auth()->user()->branch_id,
                            'child_id' => $child->id,
                            'booking_id' => Helpers::decodeHashedID($value['id']),
                            'date' => $value['date'],
                            'type' => '1',
                            'drop_user' => null,
                            'drop_time' => null,
                            'drop_geo_coordinates' => null,
                            'drop_signature' => null,
                            'drop_child_note_id' => null,
                            'pick_user' => null,
                            'pick_time' => null,
                            'pick_geo_coordinates' => null,
                            'pick_signature' => null,
                            'pick_child_note_id' => null,
                            'is_extra_day' => '0',
                            'ccs_submitted' => false,
                            'deleted_at' => null,
                            'created_at' => $current_date,
                            'updated_at' => $current_date
                        ]);
                    }
                });

                /*---------------------------------*/

                if (!empty($booking_updates))
                {
                    $this->batchService->update($this->booking, $booking_updates);
                }

                if (!empty($attendance_list))
                {
                    app("Kinderm8\\{$attendance_model}")->insert($attendance_list);
                }

                if (!empty($attendance_update_list))
                {
                    $this->batchService->update(app("Kinderm8\\{$attendance_model}"), $attendance_update_list);
                }

                unset($attendance_list);
                unset($current_date);
            }
            // change dates
            else
            {
                $delete_booking_list = [];

                // get all bookings
                $booking_full_list = $this->booking
                    ->whereIn('child_id', $child_list->pluck('id'))
                    ->where('organization_id', auth()->user()->organization_id)
                    ->where('branch_id', auth()->user()->branch_id)
                    ->whereBetween('date', [ $start_date, $end_date ])
                    ->whereIn('fee_id', array_values(array_map(function ($item) { return Helpers::decodeHashedID($item['fee']); }, $booking_items)))
                    ->whereIn('room_id', array_values(array_map(function ($item) { return Helpers::decodeHashedID($item['room']); }, $booking_items)))
                    ->where('status', '!=', '1') // ignore attendance
                    ->get();

                $child_list->each(function ($child) use ($booking_items, $booking_full_list, &$delete_booking_list)
                {
                    // get by child
                    $fullFilteredList = $booking_full_list->filter(function ($i) use ($child) { return $i->child_id === $child->id; })->pluck('id')->toArray();

                    $filteredList = array_map(function ($r) { return Helpers::decodeHashedID($r['id']); }, array_filter($booking_items, function ($i) use ($child) { return Helpers::decodeHashedID($i['child']) === $child->id; }));

                    $delete_booking_list = array_merge($delete_booking_list, array_values(array_diff($fullFilteredList, $filteredList)));
                });

                if (!empty($delete_booking_list))
                {
                    $this->booking->destroy($delete_booking_list);
                }

                unset($booking_full_list);
            }
        }
        // delete
        else
        {
            $this->booking->destroy($booking_ids);
        }

        return [
            'room_update' => $room_id,
            'slots' => $booking_items,
            'removed_attendance' => $removed_attendance_ids
        ];
    }

    /**
     * @param Collection|null $child_list
     * @param Request $request
     * @param string $room_id
     * @return array
     */
    public function masterRollGetBookingsPreviewSlots(?Collection $child_list, Request $request, string $room_id)
    {
        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;
        $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
        $slots = $request->input('slots');
        $dateList = [];

        // get booking from database
        $getBookings = ($type === '0')
            ? $this->booking->where('date', $start_date)
            : $this->booking->whereBetween('date', [$start_date, $end_date]);

        // access
        $getBookings = $this->attachAccessibilityQuery($getBookings);

        $getBookings = $getBookings
            ->whereIn('child_id', $child_list->pluck('id'))
            ->get()
            ->toArray();

        if($type === '0') // casual
        {
            $child_list->each(function ($child) use (&$dateList, $slots, $start_date)
            {
                foreach ($slots as $slot)
                {
                    array_push($dateList, array_merge([
                        'child' => new ChildResource($child, [ 'basic' => true, 'withRooms' => true ]),
                        'date' => $start_date,
                        'day' => strtolower(Carbon::parse($start_date)->format('l')),
                        'selected' => false,
                        'disabled' => false
                    ], $slot));
                }
            });
        }
        else if($type === '1') // weekly
        {
            $child_list->each(function ($child) use (&$dateList, $slots, $start_date, $end_date)
            {
                $period = CarbonPeriod::create($start_date, $end_date);

                $dateList = array_merge($dateList, $this->generateSlots($period, $slots, $child));
            });
        }
        else // alternative week
        {
            $child_list->each(function ($child) use (&$dateList, $slots, $start_date, $end_date)
            {
                $period = CarbonPeriod::create($start_date, '1 week', $end_date)->toArray();

                for ($i = 0; $i < count($period); $i++)
                {
                    if($i % 2 !== 0)
                    {
                        continue;
                    }

                    $period_week = null;

                    $period_week = ($i === count($period) - 1)
                        ? CarbonPeriod::create($period[$i]->format('Y-m-d'), $end_date)
                        : CarbonPeriod::create($period[$i]->format('Y-m-d'), $period[$i + 1]->subDays(1)->format('Y-m-d'));

                    if(!empty($period_week))
                    {
                        $dateList = array_merge($dateList, $this->generateSlots($period_week, $slots, $child));
                    }
                }
            });
        }

        // validate date list
        foreach ($dateList as &$item)
        {
            $dbData = array_values(array_filter(
                $getBookings,
                function ($e) use (&$item)
                {
                    return $item['date'] === $e['date'] && $item['child']->id === $e['child_id'];
                }
            ));

            if(!empty($dbData))
            {
                foreach ($dbData as $el)
                {
                    if($item['start'] < $el['session_end'] && $el['session_start'] < $item['end'])
                    {
                        $item['disabled'] = true;

                        break;
                    }
                }
            }
        }

        return $dateList;
    }

    /**
     * @param Collection|null $child_list
     * @param Request $request
     * @param string $room_model
     * @param string $fee_model
     * @return array
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function masterRollGetManageBookingsPreviewSlots(?Collection $child_list, Request $request, string $room_model, string $fee_model)
    {
        $start_date = (! Helpers::IsNullOrEmpty($request->input('date_start'))) ? $request->input('date_start') : null;
        $end_date = (! Helpers::IsNullOrEmpty($request->input('date_end'))) ? $request->input('date_end') : null;
        $action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;
        $operation = (! Helpers::IsNullOrEmpty($request->input('operation'))) ? $request->input('operation') : null;
        $room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;
        $adjust_fee_id = (! Helpers::IsNullOrEmpty($request->input('adjust_fee_id'))) ? Helpers::decodeHashedID($request->input('adjust_fee_id')) : null;
        $summary_filters = ($request->input('summary_filter') !== '') ? json_decode(json_encode($request->input('summary_filter'))) : null;
        $days = $request->input('days');

        $session_start_time = (! Helpers::IsNullOrEmpty($request->input('hourly_start'))) ? (int) $request->input('hourly_start') : null;
        $session_end_time = (! Helpers::IsNullOrEmpty($request->input('hourly_end'))) ? (int) $request->input('hourly_end') : null;

        $feeObject = null;

        // get booking from database
        $getBookings = $this->booking
            ->with(['room', 'fee', 'fee_adjusted', 'child.rooms'])
            ->whereIn('child_id', $child_list->pluck('id'))
            ->whereBetween('date', [$start_date, $end_date])
            ->whereIn('day', $days);

        // access
        $getBookings = $this->attachAccessibilityQuery($getBookings);

        // edit action and validate
        if ($action === '0')
        {
            // room
            if($operation === '0')
            {
                if(is_null(app("Kinderm8\\{$room_model}")->find($room_id)))
                {
                    throw new ResourceNotFoundException('room - resource not found exception', ErrorType::NotFound);
                }

                /*$getBookings->whereHas('child.rooms', function($query) use ($room_id)
                {
                    $query->where('room_id', $room_id);
                });*/
            }

            // fee
            if ($operation === '1')
            {
                $feeObject = app("Kinderm8\\{$fee_model}")->find($fee_id);

                if(is_null($feeObject))
                {
                    throw new ResourceNotFoundException('fee - resource not found exception', ErrorType::NotFound);
                }
            }
        }

        // delete action and summery filter $action === '1' &&
        if (!is_null($summary_filters))
        {
            if (isset($summary_filters->rooms) && is_array($summary_filters->rooms) && !empty($summary_filters->rooms))
            {
                $getBookings->whereHas('room', function ($query) use ($summary_filters)
                {
                    $query->whereIn('id', Helpers::decodeHashedID($summary_filters->rooms));
                });
            }

            if (isset($summary_filters->fees) && is_array($summary_filters->fees) && !empty($summary_filters->fees))
            {
                $getBookings->whereHas('fee', function ($query) use ($summary_filters)
                {
                    $query->whereIn('id', Helpers::decodeHashedID($summary_filters->fees));
                });
            }
        }

        $getBookings = $getBookings
            ->orderBy('date', 'ASC')
            ->orderBy('session_start', 'ASC')
            ->get();

        // check if booking exists
        if ($getBookings->count() < 1)
        {
            throw new Exception(LocalizationHelper::getTranslatedText('booking.slots_not_available'), ErrorType::CustomValidationErrorCode);
        }

        // get child group items
        $groupedChildList = Helpers::array_group_by($getBookings->toArray(), 'child_id');

        // format date list
        $validGroupedChildList = [];

        if (count(array_filter($groupedChildList, function ($item) { return empty($item); })) !== count($groupedChildList))
        {
            foreach ($groupedChildList as $key => $item)
            {
                /*$validGroupedChildList[Helpers::hxCode($key)] = empty($item)
                    ? []
                    : $this->formatPreviewItems(Helpers::array_group_by($item, 'date'), $abs_reason, $action, $operation, $request, $feeObject);*/

                if(!empty($item))
                {
                    $current_child = $child_list->first(function ($child) use ($key) { return $child->id === $key; });

                    $validGroupedChildList = array_merge(
                        $validGroupedChildList,
                        $this->formatPreviewItems(Helpers::array_group_by($item, 'date'), $current_child, $action, $operation, $request, $feeObject, $adjust_fee_id)
                    );
                }

            }
        }

        return $validGroupedChildList;
    }

    /**
     * @param array $args
     * @param Request $request
     * @return array
     */
    public function ReportRollList(array $args, Request $request)
    {
        $default_end = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));
        $default_start = '1900-01-01';

        $start = (! Helpers::IsNullOrEmpty($request->input('sdate'))) ? $request->input('sdate') : $default_end;
        $end = (! Helpers::IsNullOrEmpty($request->input('edate'))) ? $request->input('edate') :  $default_start;

        //filters
        $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

        // query builder
        $bookings = $this->booking->with(['child', 'room', 'fee', 'fee_adjusted', 'attendance', 'room.roomCapacity']);

        //access
        $bookings = $this->attachAccessibilityQuery($bookings);

        //filters
        if($request->input('filterBy') === 'CHILD' && !empty($request->input('child')) ) {
            $child_array =  [];
            foreach($request->input('child') as $childList) {
                $id = Helpers::decodeHashedID($childList);
                array_push($child_array, $id);
            }

            $bookings = $bookings->whereIn('child_id', $child_array);
            // $bookings = $bookings->whereHas('child', function($query) use($child_array) {
            //     $query->whereIn('id', $child_array);
            // });

        }
        else if (!empty($request->input('room'))) {
            $room_array = [];
            foreach($request->input('room') as $roomList) {
                $id = Helpers::decodeHashedID($roomList);
                array_push($room_array, $id);
            }

            $bookings = $bookings->whereHas('room', function($query) use($room_array) {
                $query->whereIn('id', $room_array);
            });
        }

        $bookings = $bookings
            ->whereBetween('date', [$end,$start])
            ->orderBy('date', 'ASC')
            ->get();

            return [
                'list' => $bookings,
                'actual_count' => $bookings->count(),
            ];
    }

    /**
     * @param Request $request
     * @return Builder[]|Collection
     */
    public function kioskBookings(Request $request)
    {
        $children = json_decode($request->input('child_id'));
        $single_child = false;
        if(!is_array($children)){
            $children = array(Helpers::hxCode($children));
            $single_child = true;
        }

        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : Carbon::now($this->userTimezone)->firstOfMonth()->startOfWeek()->format('Y-m-d');
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : Carbon::now($this->userTimezone)->lastOfMonth()->endOfWeek()->format('Y-m-d');

        $all_children_bookings = array();
        foreach($children as $child_id) {

            $bookings = $this->booking->with(['child', 'room', 'fee', 'attendance'])
                ->where('child_id', Helpers::decodeHashedID($child_id))
                ->whereBetween('date', [$start, $end])
                ->orderBy('date', 'ASC')
                ->get();

            foreach ($bookings as $record) {
                if ($record->session_start != null) {
                    $time = DateTimeHelper::formatMinToTimeArray($record->session_start);
                    $dt = Carbon::now();
                    $dt->hour((int)$time['hour'])->minute((int)$time['min'])->second(0);
                    $record['start_time'] = $dt->format('g:i A');
                }

                if ($record->session_end != null) {
                    $time = DateTimeHelper::formatMinToTimeArray($record->session_end);
                    $dt = Carbon::now();
                    $dt->hour((int)$time['hour'])->minute((int)$time['min'])->second(0);
                    $record['end_time'] = $dt->format('g:i A');
                }
            }

            if($single_child){
                //old api function
                return $bookings;

            }else{

                $temp_array = array(
                    'child' => $child_id,
                    'bookings' => $bookings
                );
                array_push($all_children_bookings, $temp_array);
            }

        }

        return $all_children_bookings;
    }

    /**
     * @param Request $request
     * @param $day_index
     * @param string $room_model
     * @param string $branch_model
     * @return Builder[]|Collection
     */
    public function getDashboardSummary(Request $request, string $room_model, $day_index, string $branch_model)
    {
        $organization_id = auth()->user()->organization_id;

        $opening_hours = '';

        if(auth()->user()->hasOwnerAccess())
        {
            $branch_id = !Helpers::IsNullOrEmpty($request->input('branch_id')) ? Helpers::decodeHashedID($request->input('branch_id')): null;
        }
        else
        {
            $branch_id = auth()->user()->branch_id;
            $branch = app("Kinderm8\\{$branch_model}")->find(auth()->user()->branch_id);

            if (isset($branch->opening_hours))
            {
                $opening_hours =  app("Kinderm8\\{$branch_model}")->find(auth()->user()->branch_id)->opening_hours;
                $opening_hours[count($opening_hours)] = $opening_hours[0];
            }
        }

        $rooms =  app("Kinderm8\\{$room_model}")
            ->where('status', '=', '0')
            ->with(['child','roomCapacity'])
            ->where('organization_id', '=', $organization_id);

        if($branch_id != null)
        {
            $rooms = $rooms->where('branch_id', '=', $branch_id);
        }

        $rooms = $rooms->whereNull('deleted_at')->get();

        $response = array();

        $start_date = ($request->input('start_date') != null)? Carbon::parse($request->input('start_date')): Carbon::now($this->userTimezone)->startOfWeek();

        if(is_null($day_index))
        {
            $total_capacity = 0;
            $child_ids = array();
            foreach($rooms as $room) {

                if(count($room['roomCapacity']) >0) {
                    $total_capacity += $room['roomCapacity'][0]['capacity'];
                }

                foreach ($room['child'] as $child){
                    if($child['status'] == '1'){
                        array_push($child_ids, $child['id']);
                    }
                }
            }

            for($i = 0; $i< 7; $i++){

                if($opening_hours != '') {

                    if ($opening_hours[$i+1]['disable'] == false) {
                        $date = $start_date->format('Y-m-d');

                        $response[$i]['total_bookings'] = $this->booking->where('date', '=', $date)->whereIn('child_id', $child_ids)->count();
                        $response[$i]['total_capacity'] = $total_capacity;
                        $start_date = $start_date->addDays(1);
                    } else {
                        $response[$i] = '';
                    }

                }else{
                        $date = $start_date->format('Y-m-d');

                        $response[$i]['total_bookings'] = $this->booking->where('date', '=', $date)->whereIn('child_id', $child_ids)->count();
                        $response[$i]['total_capacity'] = $total_capacity;
                        $start_date = $start_date->addDays(1);
                }
            }

        }
        else
        {
            $date = $start_date->addDays($day_index)->format('Y-m-d');

            $i = 0;
            foreach($rooms as $room) {

                $child_ids = array();
                foreach ($room['child'] as $child){
                    if($child['status'] == '1'){
                        array_push($child_ids, $child['id']);
                    }
                }

                $response[$i]['room_name'] = $room['title'];
                $response[$i]['room_capacity'] = (count($room['roomCapacity']) >0) ? $room['roomCapacity'][0]['capacity'] : 0;
                $response[$i]['room_bookings'] = $this->booking->where('date', '=', $date)->where('room_id', '=', $room['id'])->whereIn('child_id', $child_ids)->count();

                $i++;
            }
        }

        return $response;
    }

    /**
     * @param $args
     * @param Request $request
     * @return Builder[]|EloquentCollection
     */
    public function masterRollOccupancy(array $args, Request $request)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : Carbon::now($this->userTimezone)->startOfWeek()->format('Y-m-d');
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : Carbon::now($this->userTimezone)->endOfWeek()->format('Y-m-d');

        // query builder
        $bookings = $this->booking
            ->with([ 'child', 'room', 'room.roomCapacity' ])
            ->whereHas('child', function($query)
            {
                $query->where('status', '1')->whereNull('deleted_at');
            });

        //access
        $bookings = $this->attachAccessibilityQuery($bookings);

        return $bookings
            ->whereBetween('date', [ $start, $end ])
            ->orderBy('date', 'ASC')
            ->get();
    }

    /*-------------------------------------------------------------------------*/
    /*----------------------- Booking History -----------------------------*/
    /*-------------------------------------------------------------------------*/

    /**
     * @param $args
     * @param Request $request
     */
    public function bookingHistoryList($args, Request $request)
    {
        try
        {

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }
    }
}
