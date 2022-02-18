<?php

namespace Kinderm8\Http\Controllers;

use Carbon\CarbonPeriod;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\BookingRequestActionRequest;
use Kinderm8\Http\Requests\BookingRequestDependencyRequest;
use Kinderm8\Http\Requests\BookingRequestStoreRequest;
use Kinderm8\Http\Requests\BookingRequestVerifyRequest;
use Kinderm8\Http\Resources\BookingRequestResource;
use Kinderm8\Http\Resources\BookingRequestResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Notifications\SendBranchAdminsBookingRequestMail;
use Kinderm8\Notifications\SendParentBookingRequestMail;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\BookingRequest\IBookingRequestRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\User\IUserRepository;
use LocalizationHelper;
use PathHelper;
use RequestHelper;

class BookingRequestController extends Controller
{
    private $bookingRepo;
    private $feeRepo;
    private $roomRepo;
    private $childRepo;
    private $bookingRequestRepo;
    private $userRepo;

    public function __construct(IBookingRequestRepository $bookingRequestRepo, IBookingRepository $bookingRepo, IFeeRepository $feeRepo, IRoomRepository $roomRepo, IChildRepository $childRepo, IUserRepository $userRepo)
    {
        $this->bookingRequestRepo = $bookingRequestRepo;
        $this->bookingRepo = $bookingRepo;
        $this->feeRepo = $feeRepo;
        $this->roomRepo = $roomRepo;
        $this->childRepo = $childRepo;
        $this->userRepo = $userRepo;
    }

    /**
     * get booking request list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $response = [];

        try
        {
            $ignore_depends = (! Helpers::IsNullOrEmpty($request->input('ignore_depends'))) ? filter_var($request->input('ignore_depends'), FILTER_VALIDATE_BOOLEAN) : false;

            if (!$ignore_depends)
            {
                //get children
                $children = $this->childRepo->get([
                    'start_date_validation' => true,
                    'status' => '1',
                    'order' => [
                        'column' => 'first_name',
                        'value' => 'asc'
                    ]
                ], [ 'rooms' ], $request, false);

                // get rooms
                $rooms = $this->roomRepo->get(
                    [
                        'status' => '0',
                        'admin_only' => false,
                        'order' => [
                            'column' => 'title',
                            'value' => 'asc'
                        ]
                    ],
                    [ 'roomCapacity' ],
                    $request, false);

                // get fees
                $fees = $this->feeRepo->get([], [ 'rooms', 'adjusted_past_collection' ], $request, false);

                $response['dependencies'] = [
                    'children' => new ChildResourceCollection($children),
                    'rooms' => new RoomResourceCollection($rooms),
                    'fees' => new FeesResourceCollection($fees, [ 'adjusted_past_future' => true ])
                ];
            }

            $request_details = $this->bookingRequestRepo->list([], $request);

            $response['requests'] = new BookingRequestResourceCollection($request_details);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                $response
            ), RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function verify(Request $request)
    {
        try
        {
            // validation
            app(BookingRequestVerifyRequest::class);

            $booking_request = $this->bookingRequestRepo->findById(
                Helpers::decodeHashedID($request->input('id')),
                [ 'child', 'child.rooms', 'room', 'fee', 'fee.adjusted_past_collection', 'fee.adjusted_future_collection', 'creator', 'booking' ]);

            $preview = [];
            $has_error = null; // 0 - no error, 1 - casual already exists, 2 - booking not found

            // get booking previews (standard booking)
            if ($booking_request->type === '1')
            {
                $slots = [];

                $period = CarbonPeriod::create($booking_request->start_date, $booking_request->end_date);

                foreach ($period as $date)
                {
                    array_push($slots, [
                        'day' => strtolower($date->format('l')),
                        'values' => [
                            [
                                'room' => $booking_request->room->index,
                                'fee' => $booking_request->fee->index,
                                'fee_amount' => (float) $booking_request->fee->net_amount,
                                'start' => $booking_request->fee->session_start,
                                'end' => $booking_request->fee->session_end
                            ]
                        ]
                    ]);
                }

                unset($period);

                $request->request->add([
                    'date_start' => $booking_request->start_date,
                    'date_end' => $booking_request->end_date,
                    'type' => '1',
                    'slots' => $slots
                ]);

                $preview = $this->bookingRepo->getPreviewSlots($booking_request->child, $request);
            }
            // casual check
            else if ($booking_request->type === '0')
            {
                $booking = $this->bookingRepo
                    ->where('child_id', $booking_request->child_id)
                    ->where('date', $booking_request->start_date)
                    ->get();

                // validated booking slots with existing records
                if($this->bookingRepo->isOverlapped($booking->toArray(), [
                    'start' => $booking_request->fee->session_start,
                    'end' => $booking_request->fee->session_end
                ]))
                {
                    $has_error = [
                        'code' => 1,
                        'message' => LocalizationHelper::getTranslatedText('booking.session_overlapped')
                    ];
                }
                else if (!$booking->isEmpty())
                {
                    $has_error = [
                        'code' => 1,
                        'message' => 'Can not complete this request! (Booking already exists)'
                    ];
                }
            }
            // for available bookings
            else if (in_array($booking_request->type, ['2', '3', '4', '5']))
            {
                if (is_null($booking_request->booking))
                {
                    $has_error = [
                        'code' => 2,
                        'message' => 'Can not complete this request! (Booking not available)'
                    ];
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'request' => new BookingRequestResource($booking_request),
                        'abs_reason' => CCSType::BOOKING_ABSENCE_REASON,
                        'preview' => $preview,
                        'error_type' => $has_error
                    ]
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function action(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingRequestActionRequest::class);

            $action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;

            // get booking request
            $booking_request = $this->bookingRequestRepo->findById(Helpers::decodeHashedID($request->input('id')), ['child', 'child.rooms', 'branch', 'booking', 'creator']);

            // reject
            if ($action === '1')
            {
                $booking_request->status = '2';
                $booking_request->update();
            }
            // accept
            else
            {
                // room validation (not standard booking)
                if ($booking_request->type !== '1' && $booking_request->child->rooms->filter(function ($item) use ($request) { return $item->id === Helpers::decodeHashedID($request->input('room')); })->isEmpty())
                {
                    throw new Exception(LocalizationHelper::getTranslatedText('child.room_not_assigned'), ErrorType::CustomValidationErrorCode);
                };

                $booking_request->status = '1';
                $booking_request->update();

                // create booking - casual & standard bookings
                if (in_array($booking_request->type, ['0', '1']))
                {
                    $booking_request->type === '0'
                        ? $this->createCasualBooking($booking_request, $request)
                        : $this->createStandardBooking($booking_request, $request);
                }
                // others - update booking
                else
                {
                    // absent request
                    if (!is_null($booking_request->booking) && $booking_request->type === '2')
                    {
                        $booking_request->booking()->update([
                            'status' => '2',
                            'absence_reason' => (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : 'NONE',
                            'absence_document_held' => filter_var($request->input('abs_doc_held'), FILTER_VALIDATE_BOOLEAN)
                        ]);
                    }
                    // holiday request
                    else if (!is_null($booking_request->booking) && $booking_request->type === '3')
                    {
                        $booking_request->booking()->update([ 'status' => '3' ]);
                    }
                }
            }

            /*--------------------- send mail ------------------------*/

            $booking_request->creator->notify(new SendParentBookingRequestMail($booking_request, PathHelper::getBranchUrls($request->fullUrl(), $booking_request->branch)));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /***
     * @param Model $booking_request
     * @param Request $request
     * @throws Exception
     */
    private function createCasualBooking(Model $booking_request, Request $request)
    {
        try
        {
            // add date params
            $request->request->add([
                'date' => $booking_request->start_date,
                'type' => '0'
            ]);

            // get fee
            $feeObject = $this->feeRepo->findById(Helpers::decodeHashedID($request->input('fee')));

            // get adjusted fee
            $adjusted_fee_id = (! Helpers::IsNullOrEmpty($request->input('adjust_fee_id'))) ? Helpers::decodeHashedID($request->input('adjust_fee_id')) : null;

            $feeAdjustedObject = !is_null($adjusted_fee_id) ? $this->feeRepo->findAdjustedById($adjusted_fee_id) : null;

            // insert booking
            $this->bookingRepo->store($request, $feeObject, $feeAdjustedObject, $booking_request->child, Helpers::decodeHashedID($request->input('room')), 'ChildAttendance');
        }
        catch (Exception $e)
        {
            throw $e;
        }
    }

    /**
     * @param Model $booking_request
     * @param Request $request
     * @throws Exception
     */
    private function createStandardBooking(Model $booking_request, Request $request)
    {
        try
        {
            // add date params
            $request->request->add([
                'casual' => false
            ]);

            // get selected date adjust fee

            // insert bookings
            $this->bookingRepo->bulkStore($request, 'ChildRoomSyncJob', 'FeeAdjusted');
        }
        catch (Exception $e)
        {
            throw $e;
        }
    }

    /*--------------------------------------------------------------------------*/

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceGetBookingRequests(Request $request)
    {
        try
        {
            // date filter to be implemented

            $request_details = $this->bookingRequestRepo->get([
                'child' =>  Helpers::decodeHashedID($request->input('ref'))
            ], [], $request);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingRequestResourceCollection($request_details)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException|ValidationException
     */
    public function deviceGetBookingRequestDependency(Request $request)
    {
        try
        {
            // validation
            app(BookingRequestDependencyRequest::class);

            // get child
            $childObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('id')), ['rooms']);

            $fee_options = [
                'frequency' => '0',
                'fee_type' => $request->input('type'),
                'status' => '0'
            ];

            $booking_options = [
                'child' => $childObj->id
            ];

            // casual booking
            if ($request->input('type') === '1')
            {
                $fee_options['relation_filter'] = [
                    'rooms' => [
                        [
                            'column' => 'id',
                            'value' => $childObj->rooms->pluck('id')->toArray()
                        ]
                    ]
                ];

                $booking_options['date'] = $request->input('date');

                $rooms = $childObj->rooms;
            }
            // standard booking (routine)
            else
            {
                $booking_options['between_dates'] = [ $request->input('date'), $request->input('end_date') ];

                $rooms = $this->roomRepo->get(
                    [
                        'status' => '0',
                        'admin_only' => false,
                        'order' => [
                            'column' => 'title',
                            'value' => 'asc'
                        ]
                    ],
                    [],
                    $request, false);
            }

            // get fee
            $fees = $this->feeRepo->get(
                $fee_options,
                [ 'rooms' ],
                $request, false, false);

            // get bookings
            $bookings = $this->bookingRepo->get(
                $booking_options,
                [],
                $request,
                false
            );

            // validation
            $validCollection = new Collection();

            if (!$bookings->isEmpty())
            {
                $fees->each(function ($item) use ($bookings, $validCollection)
                {
                    $feeObj = [
                        'start' => $item->toArray()['session_start'],
                        'end' => $item->toArray()['session_end']
                    ];

                    if (!$this->bookingRepo->isOverlapped($bookings->toArray(), $feeObj))
                    {
                        $validCollection->add($item);
                    }
                });
            }
            else
            {
                $validCollection = $fees;
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'sessions' => new FeesResourceCollection($validCollection, [ 'basic' => true ]),
                        'rooms' => new RoomResourceCollection($rooms, [ 'basic' => true ])
                    ]

                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function deviceCreate(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingRequestStoreRequest::class);

            // validate if already created
            if ($this->bookingRequestRepo->exists($request))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('booking-request.request_exists')
                    ), RequestType::CODE_400);
            }

            $booking_request = $this->bookingRequestRepo->store($request);

            /*--------------------- send mail ------------------------*/

            $admin_users = $this->userRepo->findAdministrativeUsers($request, true, false);

            Notification::send($admin_users, new SendBranchAdminsBookingRequestMail($booking_request, PathHelper::getBranchUrls($request->fullUrl(), $booking_request->branch)));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException|ValidationException
     * @throws Exception
     */
    public function deviceUpdate(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingRequestStoreRequest::class);

            $this->bookingRequestRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            if ($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function deviceDelete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->bookingRequestRepo->delete(Helpers::decodeHashedID($request->input('id')));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
