<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Helpers;
use Carbon\Carbon;
use CCSHelpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Branch;
use Kinderm8\User;
use Kinderm8\Child;
use Kinderm8\Room;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\AttendanceResourceCollection;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\CCSEnrolmentResourceCollection;
use Kinderm8\Http\Resources\ChildResource;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\RoomResource;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSEntitlement\ICCSEntitlementRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\StaffAttendance;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use Log;
use RequestHelper;

class AttendanceController extends Controller
{
    private $attendanceRepo;
    private $bookingRepo;
    private $childRepo;
    private $roomRepo;
    private $enrolmentRepo;
    private $branchRepo;
    private $ccsEntitlementRepo;
    private $userRepo;

    use UserAccessibility;

    public function __construct(IAttendanceRepository $attendanceRepo, IBookingRepository $bookingRepo, IChildRepository $childRepo, IRoomRepository $roomRepo, ICCSEnrolmentRepository $enrolmentRepo, IBranchRepository $branchRepo, ICCSEntitlementRepository $ccsEntitlementRepo, IUserRepository $userRepo)
    {
        $this->attendanceRepo = $attendanceRepo;
        $this->bookingRepo = $bookingRepo;
        $this->childRepo = $childRepo;
        $this->roomRepo = $roomRepo;
        $this->enrolmentRepo = $enrolmentRepo;
        $this->branchRepo = $branchRepo;
        $this->ccsEntitlementRepo = $ccsEntitlementRepo;
        $this->userRepo = $userRepo;
    }

    /**
     * get attendance week list
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        try
        {
            $attendances = $this->attendanceRepo
                ->weekList(
                    [],
                    $request,
                    'Booking'
                );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $attendances = [];
        }

        return (new BookingResourceCollection($attendances, [ 'withAttendance' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getAttendanceByChildren(Request $request)
    {
        try
        {
            $children = $this->childRepo->find(Helpers::decodeHashedID($request->input('children')));

            $attendanceList = $this->attendanceRepo->findByChildren(
                $request,
                $children,
                ['child', 'creator', 'dropper', 'picker'],
                false
            );

            // check if preview slots available
            if($attendanceList->isEmpty())
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
                    new AttendanceResourceCollection($attendanceList, [ 'withChild' => true ])
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
    public function getDashboardLiveRatio(Request $request)
    {
        try 
        {
            if(auth()->user()->hasOwnerAccess() && is_null($request->input('branch_id'))){
                $first_branch = $this->branchRepo->findByOrg(auth()->user()->organization_id, [ 'status' => '0' ], false)->first();
                if($first_branch) {
                    $request['branch_id'] = $first_branch->index;
                }
            }

            $response = array();
            $rooms = $this->attendanceRepo->roomAttendance($request,'Room', 'StaffAttendance');

            $center_child_in = 0;
            $center_staff_in = 0;
            $required_staff = 0;
            $current_staff = 0;
            $stafflist = array();

            foreach($rooms as $room){

                $staff_in = $room['staff_attendance'];
                $staff_names = $room['staff_names'];
                $live_child_attendace_ratio = ($staff_in != 0) ? $room['attendance_count'] / $staff_in : $room['attendance_count'];

                $temp_array = array(
                    'room_name' => $room['title'],
                    'status'=> ($live_child_attendace_ratio > $room['staff_ratio']) ? 'red': (($live_child_attendace_ratio < $room['staff_ratio']) ? 'green': ''),
                    'staff_in'=> $staff_in,
                    'staff_names'=> $staff_names,
                    'child_in'=> $room['attendance_count'],
                    'expected_ratio'=> '1:'.$room['staff_ratio'],
                    'live_ratio'=> (($staff_in != 0)? '1:' :'0:').round($live_child_attendace_ratio, 2),
                    'popup_visible'=> false,
                );

                array_push($response, $temp_array);

                $center_child_in += $room['attendance_count'];
                $center_staff_in += $staff_in;
                $required_staff += ceil($room['attendance_count'] / (($room['staff_ratio'] != null)? $room['staff_ratio']: 1));
                $current_staff += $staff_in;

                foreach($staff_names as $staff_name){
                    array_push($stafflist, $staff_name);
                }
            }

            if($request->route()->getName() == 'get-dashboard-attendances'){

                $center = array(
                    'center_child_in' => $center_child_in,
                    'center_staff_in'=> $center_staff_in,
                    'required_staff'=> $required_staff,
                    'current_staff'=> $current_staff,
                    'staff_names'=> $stafflist
                );

                $response = [
                    'room_data' => $response,
                    'center_data' => $center
                ];

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        $response
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        $response
                    ), RequestType::CODE_200);
            }            

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDashboardAttendanceSummary(Request $request)
    {
        try
        {
            $response = array();
            $request['start'] = $request['date'];
            $request['end'] = $request['date'];
            $room = (! Helpers::IsNullOrEmpty($request->input('room'))) ? Helpers::decodeHashedID($request->input('room')) : null;

            if(auth()->user()->hasOwnerAccess() && is_null($request->input('branch_id'))){
                $first_branch = $this->branchRepo->findByOrg(auth()->user()->organization_id, [ 'status' => '0' ], false)->first();
                if($first_branch) {
                    $request['branch_id'] = $first_branch->index;
                }
            }
            $branch_id = ($request->input('branch_id') != null)? Helpers::decodeHashedID($request->input('branch_id')): null;

            if($request->route()->getName() == 'device-dashboard-attendance'){
                // mobile api route
                $branch_id = auth()->user()->branch_id;
            }

            if($room != null){
                $bookings = $this->bookingRepo->findByBranch(
                    $branch_id,
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
                                ],
                            'room' => [
                                    [
                                        'column' => 'id',
                                        'value' => $room
                                    ]
                                ]
                        ]
                    ],
                    ['child'],
                    false,
                    $request
                );

            }else{
                $bookings = $this->bookingRepo->findByBranch(
                    $branch_id,
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
                    ['child'],
                    false,
                    $request
                );
            }
           
            $response['bookings'] = $bookings->count();
            $booking_ids = $bookings->pluck('id');

            $today_attendance = $this->attendanceRepo->getByDay($request, '', 'ChildNote')->whereIn('booking_id', $booking_ids);
            $response['child_in'] = $today_attendance->where('type', '=', '0')->whereNull('pick_time')->count();
            $response['child_out'] = $today_attendance->where('type', '=', '0')->whereNotNull('pick_time')->count();
            $response['absent'] = $today_attendance->where('type', '=', '1')->count();
            $response['unknown'] = $response['bookings'] - $today_attendance->count();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }


    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceRoomAttendanceSummary(Request $request)
    {
        try
        {
            $response = array();
            $request['start'] = $request['date'];
            $request['end'] = $request['date'];

            $branch_id = auth()->user()->branch_id;

            $rooms = Room::orderBy('title', 'ASC')->get();
            $response = [];

            foreach($rooms as $room){

                $temp = [];
                $bookings = $this->bookingRepo->findByBranch(
                    $branch_id,
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
                                ],
                            'room' => [
                                    [
                                        'column' => 'id',
                                        'value' => $room->id
                                    ]
                                ]
                        ]
                    ],
                    ['child'],
                    false,
                    $request
                );

                $bookings_count = $bookings->count();
                $booking_ids = $bookings->pluck('id');

                $today_attendance = $this->attendanceRepo->getByDay($request, '', 'ChildNote')->whereIn('booking_id', $booking_ids);
                $temp['child_in'] = $today_attendance->where('type', '=', '0')->whereNull('pick_time')->count();
                $temp['child_out'] = $today_attendance->where('type', '=', '0')->whereNotNull('pick_time')->count();
                $temp['absent'] = $today_attendance->where('type', '=', '1')->count();
                $temp['unknown'] = $bookings_count - $today_attendance->count();
                $temp['room'] = new RoomResource($room);

                array_push($response, $temp);                
            }         

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceWeeklyRoomBookingSummary(Request $request)
    {
        try
        {
            $branch_id = auth()->user()->branch_id;
          
            $rooms = Room::orderBy('title', 'ASC')->get();
            $response = [];

            $begin = Carbon::createFromFormat('Y-m-d',  $request['start_date']);
            $end   = Carbon::createFromFormat('Y-m-d',  $request['end_date']);
           
            for($i = $begin; $i <= $end; $i->modify('+1 day')){
                $date=  $i->format("Y-m-d");
                $day=   strtolower($i->format('l'));
             
                $request['start'] = $date;
                $request['end'] = $date;

                foreach($rooms as $room){
                    
                    $bookings = $this->bookingRepo->findByBranch(
                        $branch_id,
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
                                    ],
                                    'room' => [
                                        [
                                            'column' => 'id',
                                            'value' => $room->id
                                        ]
                                    ]
                            ]
                        ],
                        [],
                        false,
                        $request
                    );
                    
                    $response[$day][$room->id] = new BookingResourceCollection($bookings, [ ]);             
                }     
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }


    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getCenterWiseRatioData(Request $request)
    {

        try {
            $request['start'] = $request['date'];
            $request['end'] = $request['date'];


            if(auth()->user()->hasOwnerAccess() && is_null($request->input('branch_id'))){

                $first_branch = $this->branchRepo->findByOrg(auth()->user()->organization_id, [ 'status' => '0' ], false)->first();

                if($first_branch) {
                        $request['branch_id'] = $first_branch->index;
                }
                else
                {
                    return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_200,
                            LocalizationHelper::getTranslatedText('response.success_request'),
                            ['widget_table' => null,
                                'required_total'=> 0,
                                'current_total' => 0,
                                'current_educators' => 0,
                                'message' => 'Branch Not Selected']
                        ), RequestType::CODE_200);
                }
            }


            $branch_id = ($request->input('branch_id') != null)? Helpers::decodeHashedID($request->input('branch_id')): null;

            $date = $request->input('date');

            if($request->route()->getName() == 'device-dashboard-center-wise-ratio'){
                // mobile api route
                $branch_id = auth()->user()->branch_id;
            }

            $bookings = $this->bookingRepo->findByBranch(
                $branch_id,
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
                ['child','attendance'],
                false,
                $request,
                true
            );

            // only get attending bookings and children that are currently in. ignore bookings which do not have an attendance
            foreach($bookings as $key=>$booking)
            {
                if($booking->attendance)
                {
                    if($booking->attendance->pick_time)
                        unset($bookings[$key]);
                    //if child is absent ignore that booking too.
                    if($booking->attendance->type==1)
                        unset($bookings[$key]);
                }
                else
                    unset($bookings[$key]);
            }
            $branch = Branch::find($branch_id);
            $userTimezone = (auth()->check())? auth()->user()->timezone : null;
            $staff_attendance =  StaffAttendance::where('checkin_type', '=', 'room')
                ->where('branch_id',$branch_id)
                ->where('organization_id', '=', $branch->organization_id)
                ->whereNull('checkout_datetime')
                ->whereDate('checkin_datetime', strtolower(Carbon::now($userTimezone)->format('Y-m-d')))->distinct('staff_id')->with('staff')->get();
            $staff_attendance_count = $staff_attendance->count();

            $groupedChildrenArray = [];
            $totalEducatorsNeeded = 'N/A';
            $centerRatioExists = false;
            if($branch->center_settings)
            {
                if(array_key_exists('center_ratio',$branch->center_settings) && $branch->center_settings['center_ratio'] != null)
                {
                    $centerRatioExists = true;
                    $centerRatios = $branch->center_settings['center_ratio'];
                    $groupedChildren = [];
                    //\Log::info(gettype($bookings));
                    $totalEducatorsNeeded = 0;
                    foreach($centerRatios as $key => $centerRatio)
                    {
                        $count = $this->array_get_range($bookings, $centerRatio['age_start'],$centerRatio['age_end'])->count();
                        $ratio = explode(':', $centerRatio['ratio_display']);
                        $totalEducatorsNeeded = $totalEducatorsNeeded + number_format(intval(intval($ratio[0])*intval($count))/intval($ratio[1]), 2);
                        $groupedChildren[$key] = [
                            'age_start' => $centerRatio['age_start'],
                            'age_end'=> $centerRatio['age_end'],
                            'age_group' => $centerRatio['age_group'],
                            'count' => $count ,
                            'ratio_display' => $centerRatio['ratio_display'],
                            'ratio_calculate' => number_format(intval($ratio[0])/intval($ratio[1]),2),
                            'educators_needed' => number_format(intval(intval($ratio[0])*intval($count))/intval($ratio[1]), 2),
                        ];
                    }
                    //\Log::info(json_encode($groupedChildren));
                    $groupedChildrenArray = (array)$groupedChildren;
                }
            }
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    ['widget_table' => $groupedChildrenArray,
                        'required_total'=> ceil($totalEducatorsNeeded),
                        'current_total' => $staff_attendance_count,
                        'current_educators' => $staff_attendance->pluck('staff'),
                        'message' => (!$centerRatioExists)? 'Please setup Center Educator Ratios in Service Settings': null]
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /*
     * divide children into groups according to center age groups
     * */
    function array_get_range($collection, $min, $max) {
        return $collection->filter(function($element) use ($min, $max) {
            if($max!=null)
                return $element->child->agemonths >= $min && $element->child->agemonths <= $max;
            else
                return $element->child->agemonths >= $min;
        });
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceGetParentYtd(Request $request)
    {
        try
        {

            if(auth()->user()->isParent())
            {

                $parent_id = auth()->user()->id;

                $parent = $this->userRepo->findById($parent_id, ['child.active_ccs_enrolment']);
                $children_list = [];

                foreach ($parent->child as $child) {

                    if ($child->active_ccs_enrolment && count($child->active_ccs_enrolment) > 0) {

                        $enrolment_id = $child->active_ccs_enrolment[0]['enrolment_id'];

                        $entitlement_data = $this->ccsEntitlementRepo->where('enrolment_id', '=', $enrolment_id)->orderBy('id', 'desc')->first();
                        $absence_count = $entitlement_data->absence_count ? $entitlement_data->absence_count : 0;

                        if ($entitlement_data) {
                            array_push($children_list, new ChildResource($child, ['basic' => true, 'absence_count' => $absence_count]));
                        }

                    }

                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        $children_list
                    ), RequestType::CODE_200);


            } else {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_401,
                        LocalizationHelper::getTranslatedText('auth.user_does_not_have_permission')
                    ), RequestType::CODE_401);

            }

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceGetAbsentChildren(Request $request)
    {
        try
        {
            $room_id =  $request->input('room_id');
            $request['start'] = strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));
            $request['end'] = strtolower(Carbon::now(auth()->user()->timezone)->format('Y-m-d'));

            if($room_id != null){
                $bookings = $this->bookingRepo->findByBranch(
                    auth()->user()->branch_id,
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
                            ],
                            'room' => [
                                [
                                    'column' => 'id',
                                    'value' => $room_id
                                ]
                            ]
                        ],
                        'status' => 2
                    ],
                    ['child'],
                    false,
                    $request
                );

            }else{
                $user_rooms = User::with(['rooms'])->find(auth()->user()->id);
                $rooms = $user_rooms->rooms->pluck('id');
                $bookings = $this->bookingRepo->findByBranch(
                    auth()->user()->branch_id,
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
                        ],
                        'status' => 2
                    ],
                    ['child'],
                    false,
                    $request
                );

                $bookings = $bookings->whereIn('room_id', $rooms);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'success',
                    $bookings->pluck('child')
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }
}
