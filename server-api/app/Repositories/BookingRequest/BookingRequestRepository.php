<?php

namespace Kinderm8\Repositories\BookingRequest;

use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\BookingRequest;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class BookingRequestRepository implements IBookingRequestRepository
{
    use UserAccessibility;

    private $bookingRequest;

    public function __construct(BookingRequest $bookingRequest)
    {
        $this->bookingRequest = $bookingRequest;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->bookingRequest, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @param bool $throwable
     * @return Builder[]|Collection
     * @throws ResourceNotFoundException
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed = false, bool $throwable = false)
    {
        $start = (! Helpers::IsNullOrEmpty($request->input('start'))) ? $request->input('start') : null;
        $end = (! Helpers::IsNullOrEmpty($request->input('end'))) ? $request->input('end') : null;

        $booking_requests = $this->bookingRequest
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
                return $query->whereBetween('start_date', [ $start, $end ]);
            });

        // access
        $booking_requests = $this->attachAccessibilityQuery($booking_requests);

        if (is_array($args) && !empty($args))
        {
            $booking_requests
                /*->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })*/
                ->when(isset($args['child']) && !is_null($args['child']), function ($query) use ($args)
                {
                    return is_array($args['child']) ? $query->whereIn('child_id', $args['child']) : $query->where('child_id', $args['child']);
                })
                ->when(isset($args['room']) && !is_null($args['room']), function ($query) use ($args)
                {
                    return is_array($args['room']) ? $query->whereIn('room_id', $args['room']) : $query->where('room_id', $args['room']);
                })
                ->when(isset($args['fees']) && !is_null($args['fees']), function ($query) use ($args)
                {
                    return is_array($args['fees']) ? $query->whereIn('fee_id', $args['fees']) : $query->where('fee_id', $args['fees']);
                })
                ->when(isset($args['type']), function ($query) use ($args)
                {
                    return $query->where('type', $args['type']);
                })
                ->when(isset($args['date']), function ($query) use ($args)
                {
                    return $query->where('start_date', $args['date']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });

            // relation filters
            if (in_array('child', $depends) && isset($args['active_child_only']))
            {
                $booking_requests->whereHas('child', function ($query)
                {
                    $query->where('status', '1');
                });
            }
        }
        // default
        else
        {
            $booking_requests->orderBy('date', 'asc');
        }

        $booking_requests = $booking_requests->get();

        if ($booking_requests->isEmpty() && $throwable)
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $booking_requests;
    }

    /**
     * @param array $args
     * @param Request $request
     * @return Builder[]|Collection
     */
    public function list(array $args, Request $request)
    {
        //filters
        $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

        // get requests
        $booking_requests = $this->bookingRequest
            ->whereHas('child', function ($query)
            {
                $query->where('status', '1');
            })
            ->where('status', '0')
            ->with([ 'child', 'child.rooms', 'room', 'fee', 'creator' ]);

        //access
        $booking_requests = $this->attachAccessibilityQuery($booking_requests);

        //filters
        if (!is_null($filters))
        {
            if (isset($filters->child) && !is_null($filters->child))
            {
                $booking_requests->where('child_id', Helpers::decodeHashedID($filters->child));
            }

            if (isset($filters->start) && !is_null($filters->start))
            {
                if (isset($filters->end) && !is_null($filters->end))
                {
                    $booking_requests->whereBetween('start_date', [ $filters->start, $filters->end ]);
                }
                else
                {
                    $booking_requests->where('start_date', $filters->start);
                }
            }
        }

        return $booking_requests
            ->orderBy('id', 'DESC')
            ->get();
    }

    /**
     * @param Request $request
     * @return mixed
     */
    public function store(Request $request)
    {
        $booking_request = new $this->bookingRequest;

        $booking_request->organization_id = auth()->user()->organization_id;
        $booking_request->branch_id = auth()->user()->branch_id;
        $booking_request->created_by = auth()->user()->id;
        $booking_request->child_id = Helpers::decodeHashedID($request->input('child'));

        $booking_request->room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $booking_request->fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;
        $booking_request->booking_id = (! Helpers::IsNullOrEmpty($request->input('booking'))) ? Helpers::decodeHashedID($request->input('booking')) : null;

        $booking_request->type = $request->input('type'); // 0 - casual booking, 1 - normal booking, 2 - absence, 3 - holiday, 4 - late drop off, 5 - late pick up
        $booking_request->start_date = $request->input('date');
        $booking_request->request_type = (! Helpers::IsNullOrEmpty($request->input('is_mobile')) && $request->input('is_mobile')) ? '0' : '1'; // 0 - mobile app, 1 - enrolment form
        $booking_request->end_date = (! Helpers::IsNullOrEmpty($request->input('end_date'))) ? $request->input('end_date') : null;
        $booking_request->morning_days = (! Helpers::IsValidArrayInput($request->input('morning_selected_days'))) ? json_encode($request->input('morning_selected_days')) : null;
        $booking_request->afternoon_days = (! Helpers::IsValidArrayInput($request->input('afternoon_selected_days'))) ? json_encode($request->input('afternoon_selected_days')) : null;
        $booking_request->selected_week_days = (! Helpers::IsValidArrayInput($request->input('week_days'))) ? json_encode($request->input('week_days')) : null;
        $booking_request->late_time = (! Helpers::IsNullOrEmpty($request->input('late_action_time'))) ? $request->input('late_action_time') : null;
        $booking_request->late_desc = (! Helpers::IsNullOrEmpty($request->input('late_action_desc'))) ? $request->input('late_action_desc') : null;

        $booking_request->save();

        // load relationships after pagination
        $booking_request->load(['branch']);

        return $booking_request;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $request = $this->bookingRequest
            ->where('id', $id)
            ->withTrashed();

        // attach relationship data
        if (!empty($depends))
        {
            $request->with($depends);
        }

        $request = $request->first();

        if (is_null($request))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $request;
    }

    /**
     * @param string $id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function update(string $id, Request $request)
    {
        $rowObj = $this->findById($id, []);

        $this->checkIfRequestIsProcessed($rowObj);

        $rowObj->room_id = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;
        $rowObj->fee_id = (! Helpers::IsNullOrEmpty($request->input('fee'))) ? Helpers::decodeHashedID($request->input('fee')) : null;

        $rowObj->type = $request->input('type'); // 0 - casual booking, 1 - normal booking, 2 - absence, 3 - holiday, 4 - late drop off, 5 - late pick up
        $rowObj->start_date = $request->input('date');
        $rowObj->end_date = (! Helpers::IsNullOrEmpty($request->input('end_date'))) ? $request->input('end_date') : null;
        $rowObj->morning_days = ($request->input('morning_selected_days') !== '') ? json_encode($request->input('morning_selected_days')) : null;
        $rowObj->afternoon_days = ($request->input('afternoon_selected_days') !== '') ? json_encode($request->input('afternoon_selected_days')) : null;
        $rowObj->selected_week_days = ($request->input('week_days') !== '') ? json_encode($request->input('week_days')) : null;
        $rowObj->late_time = (! Helpers::IsNullOrEmpty($request->input('late_action_time'))) ? $request->input('late_action_time') : null;
        $rowObj->late_desc = (! Helpers::IsNullOrEmpty($request->input('late_action_desc'))) ? $request->input('late_action_desc') : null;

        $rowObj->update();

        return $rowObj;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     * @throws Exception
     */
    public function delete(string $id)
    {
        $rowObj = $this->findById($id, []);

        $this->checkIfRequestIsProcessed($rowObj);

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
     * @param Request $request
     * @return bool
     */
    public function exists(Request $request)
    {
        $obj = $this->bookingRequest
            ->where('child_id', Helpers::decodeHashedID($request->input('child')))
            ->where('room_id', Helpers::decodeHashedID($request->input('room')))
            ->where('fee_id', Helpers::decodeHashedID($request->input('fee')))
            ->where('type', $request->input('type'));

        // 2 - absence, 3 - holiday, 4 - late drop off, 5 - late pick up
        if (in_array($request->input('type'), ['2', '3', '4', '5']))
        {
            $obj->where('booking_id', Helpers::decodeHashedID($request->input('booking')));
        }

        // casual
        if ($request->input('type') === '0')
        {
            $obj->where('start_date', $request->input('date'));
        }

        // standard
        if ($request->input('type') === '1')
        {
            $obj->where('start_date', $request->input('date'))->where('end_date', $request->input('end_date'));
        }

        return $obj->count() > 0;

    }

    /**
     * check if booking request is already processed
     * @param Model $rowObj
     * @throws Exception
     */
    private function checkIfRequestIsProcessed(Model $rowObj)
    {
        if ($rowObj->status !== '0')
        {
            throw new Exception(LocalizationHelper::getTranslatedText('booking-request.request_processed'), ErrorType::CustomValidationErrorCode);
        }
    }
}
