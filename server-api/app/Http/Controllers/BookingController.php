<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\BookingPreviewRequest;
use Kinderm8\Http\Requests\BookingSingleStoreRequest;
use Kinderm8\Http\Requests\BookingSingleUpdateRequest;
use Kinderm8\Http\Requests\BookingStoreRequest;
use Kinderm8\Http\Requests\BookingUpdateRequest;
use Kinderm8\Http\Requests\BookingUpdateTypeRequest;
use Kinderm8\Http\Requests\BulkAttendanceRequest;
use Kinderm8\Http\Requests\BulkAttendanceUpdateRequest;
use Kinderm8\Http\Requests\ManageBookingsPreviewRequest;
use Kinderm8\Http\Resources\BookingResource;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use RequestHelper;

class BookingController extends Controller
{
    use UserAccessibility;

    private $bookingRepo;
    private $feeRepo;
    private $childRepo;
    private $attendanceRepo;
    private $userRepo;
    private $roomRepo;
    private $snsService;
    private $branchRepo;

    public function __construct(IBookingRepository $bookingRepo, IFeeRepository $feeRepo, IChildRepository $childRepo, IAttendanceRepository $attendanceRepo, IUserRepository $userRepo, IRoomRepository $roomRepo, SNSContract $SNSService, IBranchRepository $branchRepo)
    {
        $this->bookingRepo = $bookingRepo;
        $this->feeRepo = $feeRepo;
        $this->childRepo = $childRepo;
        $this->attendanceRepo = $attendanceRepo;
        $this->userRepo = $userRepo;
        $this->roomRepo = $roomRepo;
        $this->snsService = $SNSService;
        $this->branchRepo = $branchRepo;
    }

    /**
     * get booking list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        try
        {
            $bookings = $this->bookingRepo->list([], $request);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $bookings = [];
        }

        return (new BookingResourceCollection($bookings, [ 'withAttendance' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /***
     * Get booking related data
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $type = (! Helpers::IsNullOrEmpty($request->input('type'))) ? $request->input('type') : null;
            $get_abs_reason = (! Helpers::IsNullOrEmpty($request->input('abs_reason'))) ? $request->input('abs_reason') : null;
            $ref_id = (! Helpers::IsNullOrEmpty($request->input('ref'))) ? Helpers::decodeHashedID($request->input('ref')) : null;

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

            // get fee
            $fees = $this->feeRepo
                ->with([ 'rooms', 'adjusted_past_collection', 'adjusted_future_collection' ])
                ->when(!is_null($type), function ($query) use ($type) // normal or casual type
                {
                    return $query->where('fee_type', $type);
                });

            //access
            $fees = $this->attachAccessibilityQuery($fees)->get();

            /*// normal or casual type
            if (!is_null($type)) $fees->where('fee_type', $type);

            //access
            $fees = $this->attachAccessibilityQuery($fees)->get();

            // include selected - edit
            if(!is_null($ref_id))
            {
                $fees_by_id = $this->feeRepo->findById($ref_id);
                $fees = $fees->push($fees_by_id);
                $fees->unique()
            }
            */

            /*------------------------------------------------------------*/

            $response = [
                'fees' => new FeesResourceCollection($fees, [ 'adjusted_past_future' => true ]),
                'rooms' => new RoomResourceCollection($rooms)
            ];

            // include enrolment reasons
            if(!is_null($get_abs_reason)) $response['abs_reason'] = CCSType::BOOKING_ABSENCE_REASON;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get ccs absence reasons
     * @param Request $request
     * @return JsonResponse
     */
    public function getAbsenceReasons(Request $request)
    {
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                CCSType::BOOKING_ABSENCE_REASON
            ), RequestType::CODE_200);
    }

    /**
     * Store booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingStoreRequest::class);

            //store
            $this->bookingRepo->bulkStore($request, 'ChildRoomSyncJob', 'FeeAdjusted');

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
     * create single booking
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function createSingle(Request $request)
    {
        DB::beginTransaction();

        try
        {
            if (!$request->input('device_route'))
            {
                // validation
                app(BookingSingleStoreRequest::class);
            }

            $child_id = Helpers::decodeHashedID($request->input('child'));
            $room_id = Helpers::decodeHashedID($request->input('room'));
            $fee_id = Helpers::decodeHashedID($request->input('fee'));
            $adjusted_fee_id = (! Helpers::IsNullOrEmpty($request->input('adjust_fee_id'))) ? Helpers::decodeHashedID($request->input('adjust_fee_id')) : null;

            // validate
            $childObj = $this->childRepo
                ->with('rooms')
                ->whereHas('rooms', function (Builder $query) use ($room_id)
                {
                    $query->where('id', $room_id);
                })
                ->where('id', $child_id)
                ->get()
                ->first();

            // get fee
            $feeObject = $this->feeRepo->findById($fee_id);

            // get adjusted fee
            $feeAdjustedObject = !is_null($adjusted_fee_id) ? $this->feeRepo->findAdjustedById($adjusted_fee_id) : null;

            // create booking
            $booking = $this->bookingRepo->store(
                $request,
                $feeObject,
                $feeAdjustedObject,
                $childObj,
                $room_id,
                'ChildAttendance'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && !is_null($booking->attendance))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => [$booking->attendance->id],
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new BookingResource($booking)
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
     * View/get booking object
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->bookingRepo->findById(
                Helpers::decodeHashedID($request->input('index')),
                ['fee', 'fee_adjusted', 'room', 'attendance', 'attendance.dropper', 'attendance.picker']
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingResource($rowObj, [ 'withAttendance' => true ])
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update/delete booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            //validation
            app(BookingUpdateRequest::class);

            $action = (! Helpers::IsNullOrEmpty($request->input('action'))) ? $request->input('action') : null;

            // get children
            $child = $this->childRepo->get(
                [ 'reference' => Helpers::decodeHashedID($request->input('child')) ],
                [ 'rooms' ],
                $request,
                false
            );

            // update
            $result = $this->bookingRepo->bulkUpdate(
                $request,
                $action,
                'Fee',
                'FeeAdjusted',
                'ChildAttendance'
            );

            // update room sync
            $this->bookingRepo->updateChildRoomSync(
                $child,
                array_values(array_unique(array_map(function($i) { return Helpers::decodeHashedID($i['room']); }, $result['slots']))),
                $result['slots'],
                $result['room_update'],
                'ChildRoomSyncJob'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && !empty($result['removed_attendance']))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => $result['removed_attendance'],
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText(($action === '0') ?  'response.success_update' : 'response.success_delete')
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
     * Update single booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function updateSingle(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingSingleUpdateRequest::class);

            // get fee
            $feeObject = (! Helpers::IsNullOrEmpty($request->input('fee')))
                ? $this->feeRepo->findById(Helpers::decodeHashedID($request->input('fee')), [])
                : null;

            // get adjusted fee
            $feeAdjustedObject = (! Helpers::IsNullOrEmpty($request->input('adjust_fee_id')))
                ? $this->feeRepo->findAdjustedById(Helpers::decodeHashedID($request->input('adjust_fee_id')))
                : null;

            // update
            $rowObj = $this->bookingRepo->update(
                Helpers::decodeHashedID($request->input('index')),
                $feeObject,
                $feeAdjustedObject,
                $request,
                'ChildAttendance'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && (!is_null($rowObj['added_attendance']) || !is_null($rowObj['removed_attendance'])))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => [!is_null($rowObj['added_attendance']) ? $rowObj['added_attendance'] : $rowObj['removed_attendance']],
                        'action' => !is_null($rowObj['added_attendance']) ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new BookingResource($rowObj['object'])
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

    /**
     * Delete booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $removed_object = $this->bookingRepo->delete(Helpers::decodeHashedID($request->input('id')));

            // remove attendance
            if (!is_null($removed_object) && !is_null($removed_object->attendance))
            {
                $this->attendanceRepo->delete($removed_object->id);
            }

            // remove child room sync
            $this->bookingRepo->deleteChildRoomSync(
                [$removed_object->child_id],
                [$removed_object->room_id],
                'ChildRoomSyncJob'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && !is_null($removed_object) && !is_null($removed_object->attendance))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => [$removed_object->attendance->id],
                        'action' => CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

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

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function updateBookingType(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingUpdateTypeRequest::class);

            // update
            $rowObj = $this->bookingRepo->updateType(
                Helpers::decodeHashedID($request->input('id')),
                $request,
                'ChildAttendance'
            );

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && (!is_null($rowObj['added_attendance']) || !is_null($rowObj['removed_attendance'])))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => [!is_null($rowObj['added_attendance']) ? $rowObj['added_attendance'] : $rowObj['removed_attendance']],
                        'action' => !is_null($rowObj['added_attendance']) ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new BookingResource($rowObj['object'], [ 'withAttendance' => true ])
                ), RequestType::CODE_200);
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
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function updateBulkAttendance(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BulkAttendanceRequest::class);

            // update
            $added_attendances = $this->attendanceRepo->updateBulkAttendance($request, 'Booking');

            DB::commit();

            // send sns if branch is connected to current gen (kinder connect)
            if (auth()->user()->branch->kinderconnect && !empty($added_attendances))
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                    [
                        'organization' => auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'subjectid' => $added_attendances,
                        'action' => CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::ATTENDANCE_SUBJECT
                );
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update')
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
     * Generate booking preview slots
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function previewSlots(Request $request)
    {
        try
        {
            // validation
            app(BookingPreviewRequest::class);

            // get slots
            $childObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('child')), [ 'rooms' ]);

            // get slots
            $dateList = $this->bookingRepo->getPreviewSlots($childObj, $request);

            // check if preview slots available
            if(empty($dateList))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.slots_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $dateList
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
     * Manage booking preview slots
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function manageBookingsPreviewSlots(Request $request)
    {
        try
        {
            //validation
            app(ManageBookingsPreviewRequest::class);

            //get child
            $childObj = $this->childRepo->findById(Helpers::decodeHashedID($request->input('child')), []);

            //get slots
            $dateList = $this->bookingRepo->getBookingsPreviewSlots(
                $childObj,
                $request,
                'Room',
                'Fee'
            );

            // check if preview slots available
            if (empty($dateList))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.slots_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $dateList
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
     */
    public function bulkBookingAttendancePreview(Request $request)
    {
        try
        {
            //validation
            app(BulkAttendanceUpdateRequest::class);

            $reference = ($request->input('reference') !== '') ? Helpers::decodeHashedID($request->input('reference')) : null;

            $list = $this->bookingRepo->getBulkBookingAttendancePreview($reference, $request);

            // check if preview slots available
            if ($list->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.slots_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingResourceCollection($list, [ 'withAttendance' => true, 'withChild' => true ])
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Get dashboard booking summary
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDashboardUtilization(Request $request)
    {
        try
        {
            if(auth()->user()->hasOwnerAccess() && is_null($request->input('branch_id'))){
                $first_branch = $this->branchRepo->findByOrg(auth()->user()->organization_id, [ 'status' => '0' ], false)->first();
                if($first_branch) {
                    $request['branch_id'] = $first_branch->index;
                }
            }

            $days_array = array('Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
            $day_index = null;

            if ($request->input('day')) {
                if(in_array($request->input('day'), $days_array)) {
                    $day_index = array_search($request->input('day'), $days_array);
                }
            }

            $bookings = $this->bookingRepo->getDashboardSummary($request, 'Room', $day_index, 'Branch');
            $details = array();

            if (is_null($day_index)) {

                foreach ($bookings as $i => $item) {

                    if($item != '') {
                    
                        $percentageBooked = ($item['total_capacity'] != 0)? number_format((($item['total_bookings']/$item['total_capacity'])*100), 2) + 0 : 100;
                        $percentageAvailale = ($item['total_capacity'] != 0)? number_format(((($item['total_capacity'] - $item['total_bookings'])/$item['total_capacity'])*100), 2)+0: 0;
                     
                        array_push($details, array(
                                'name' => $days_array[$i],
                                'series' => array(
                                    array(
                                        'name' => 'Booked ',
                                        'value' => $item['total_bookings'],
                                        'percentage' => ' ('.$percentageBooked.'%)'
                                    ),
                                    array(
                                        'name' => 'Available ',
                                        'value' => ($item['total_capacity'] - $item['total_bookings']),
                                        'percentage' => ' ('.$percentageAvailale.'%)',
                                    )
                                )
                            )
                        );
                    }
                }

            } else {

                if($bookings != null) {
                    foreach ($bookings as $i => $item) {

                        $percentageBooked = ($item['room_capacity'] != 0)? number_format((float)(($item['room_bookings']/$item['room_capacity'])*100), 2) + 0: 100;
                        $percentageAvailale = ($item['room_capacity'] != 0)? number_format((float)((($item['room_capacity'] - $item['room_bookings'])/$item['room_capacity'])*100), 2) + 0: 0;
                       
                        array_push($details, array(
                                'name' => $item['room_name'],
                                'series' => array(
                                    array(
                                        'name' => 'Booked ',
                                        'value' => $item['room_bookings'],
                                        'percentage' => ' ('.$percentageBooked.'%)',
                                    ),
                                    array(
                                        'name' => 'Available ',
                                        'value' => ($item['room_capacity'] - $item['room_bookings']),
                                        'percentage' => ' ('.$percentageAvailale.'%)',
                                    )
                                )
                            )
                        );
                    }

                }else{
                    array_push($details, array(
                            'name' => '',
                            'series' => array(
                                array(
                                    'name' => 'Booked',
                                    'value' => 0
                                ),
                                array(
                                    'name' => 'Available',
                                    'value' => 50
                                )
                            )
                        )
                    );
                }
            }

            $response = array(
                'mainChart' => $details
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
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
     * @throws ServerErrorException
     */
    public function widgetGetBookingFees(Request $request)
    {
        try
        {
            $id = (! Helpers::IsNullOrEmpty($request->input('branch'))) ? Helpers::decodeHashedID($request->input('branch')) : null;
            $date = (! Helpers::IsNullOrEmpty($request->input('current'))) ? $request->input('current') : null;

            $bookingFees = $this->bookingRepo->findByBranch(
                $id,
                [
                    'relation_filter' => [
                        'child' => [
                            [
                                'column' => 'status',
                                'value' => '1'
                            ],
                            [
                                'column' => 'deleted_at',
                                'value' => null
                            ]
                        ]
                    ]
                ],
                ['child', 'fee', 'attendance'],
                false,
                $request
            );

            $today = $bookingFees->map(function ($item) use ($date)
            {
                return $item->date === $date ? (float) $item->fee_amount : 0;
            });

            $week = $bookingFees->map(function ($item)
            {
                return (float) $item->fee_amount;
            });

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'today' => $today->sum(),
                        'week' => $week->sum()
                    ]
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getBookingForTimeSheet(Request $request)
    {
        try
        {
            $rooms = $this->roomRepo->get(
                [ 'ids' => Helpers::decodeHashedID(json_decode($request->input('rooms'), true)) ],
                [],
                $request,
                false
            );

            $bookings = $this->bookingRepo
                ->findByRoom($rooms, [ 'children_status' => '1' ], [ 'child', 'room', 'fee' ], false, $request)
                ->sortBy('child.first_name');

            // check if preview slots available
            if($bookings->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('booking.bookings_not_available')
                    ), RequestType::CODE_404);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingResourceCollection($bookings, [ 'withChild' => true ])
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getHistory(Request $request)
    {
        try
        {
            $child_reference = Helpers::decodeHashedID(json_decode($request->input('ref'), true));

            $bookings = $this->bookingRepo->get(
                [
                    (is_array($child_reference) ? 'children' : 'child') => $child_reference
                    // 'year' => Carbon::now()->year
                ],
                [ 'fee', 'fee_adjusted', 'room', 'creator' ],
                $request,
                true
            );

            $formatList = !$bookings->isEmpty()
                ? Helpers::array_group_by(json_decode(json_encode(new BookingResourceCollection($bookings, [ 'withCreatedDate' => true ])), true), 'created_at')
                : [];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $formatList
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /*--------------------------------------------------------------------------*/

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceGetBookings(Request $request)
    {
        try
        {
            $user = $this->userRepo->findById(Helpers::decodeHashedID($request->input('id')), []);

            $children = $this->childRepo->findChildrenByParent($request, [ 'status' => '1' ], $user,false);

            $bookings = $this->bookingRepo->get(
                [ 'children' => $children ],
                [ 'child', 'room', 'fee', 'fee_adjusted', 'attendance'],
                $request,
                false
            )
            ->sortBy('child.first_name');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BookingResourceCollection($bookings, [ 'withChild' => true, 'withAttendance' => true ])
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
