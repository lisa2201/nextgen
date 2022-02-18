<?php

namespace Kinderm8\Http\Controllers;
use Carbon\Carbon;
use DateTime;
use Kinderm8\Booking;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kinderm8\Enums\RoleType;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\BookingResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Attendance\IAttendanceRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use RequestHelper;

class AttendanceReportController extends Controller
{
    use UserAccessibility;

    private $attendanceRepo;
    private $bookingRepo;
    private $roomRepo;
    private $booking;

    public function __construct(IAttendanceRepository $attendanceRepo, IBookingRepository $bookingRepo, IRoomRepository $roomRepo, Booking $booking)
    {
        $this->attendanceRepo = $attendanceRepo;
        $this->bookingRepo = $bookingRepo;
        $this->roomRepo = $roomRepo;
        $this->booking = $booking;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function view(Request $request)
    {
        try
        {
            $type = substr($request->input('type'), 0, 7);
            // \Log::info($type);
            if($type === 'ATT_ASR') {

                $attendances = $this->attendanceRepo->getBookingAttendanceForReport(
                    $request,
                    'Booking'
                );

                return (new BookingResourceCollection($attendances['list'], ['withChild' => true, 'withAttendance' =>true]))
                    ->additional([
                        'totalRecords' => $attendances['actual_count'],
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            }

            if($type === 'ATT_RBR') {

                $attendances = $this->bookingRepo->ReportRollList(
                    [],
                    $request
                );
                // \Log::info($attendances);
                return (new BookingResourceCollection($attendances['list'],['withChild' => true, 'withAttendance' =>true]))
                    ->additional([
                        'totalRecords' => $attendances['actual_count'],
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            }

            if($type === 'ATT_OUR') {

                $attendances = $this->bookingRepo->ReportRollList(
                    [],
                    $request
                );

                $rooms = $this->roomRepo->get(
                    [],
                    [ 'roomCapacity', 'roomCapacity.user' ],
                    $request,
                    false
                );

                $daily_bookings = array();
                foreach($attendances['list'] as $attendance){
                    $daily_bookings[] = [
                        'date' => $attendance->date,
                        'room_id' => $attendance->room->index
                    ];
                }

                $attendances['list'] = $attendances['list']->unique(function ($item) {
                    return $item['date'].$item['room_id'];
                });

                $rooms = new RoomResourceCollection($rooms);
                return (new BookingResourceCollection($attendances['list'], ['totalBookingData'=>$daily_bookings]))
                    ->additional([
                        'totalRecords' => count($attendances['list']),
                        'allrooms' =>  $rooms,
                    ])
                    ->response()
                    ->setStatusCode(RequestType::CODE_200);
            }

            if($type === 'WUS') {

                /*$attendances = $this->bookingRepo->ReportRollList(
                    [],
                    $request
                );*/
                $default_end = strtolower(Carbon::now(auth()->user()->userTimezone)->format('Y-m-d'));
                $default_start = '1900-01-01';

                $start = (! Helpers::IsNullOrEmpty($request->input('sdate'))) ? $request->input('sdate') : $default_end;
                $end = (! Helpers::IsNullOrEmpty($request->input('edate'))) ? $request->input('edate') : $default_start;

                $attendances = $this->booking->with(['child', 'room', 'fee', 'attendance', 'room.roomCapacity']);
                $attendances = $this->attachAccessibilityQuery($attendances);
                $attendances = $attendances->whereHas('child', function($query) {
                     $query->where('status', '1')->whereNull('deleted_at');
                 });

                $attendances = $attendances
                    ->whereBetween('date', [$end,$start])
                    ->orderBy('date', 'ASC')
                    ->get();
               $attendances = ['list' => $attendances, 'actual_count' => $attendances->count()];

                // group the bookings by week of year.
                $weekly_bookings = [];
                foreach($attendances['list'] as $key=>$attendance){
                    $date = new DateTime($attendance->date);
                    $week = $date->format("Y-W");
                    $attendances['list'][$key]['week'] = $week;
                    $weekly_bookings[$attendance['week']][$key] = $attendance;
                }

                // group the bookings further by room id.
                $weekly_bookingsByRoom = [];
                foreach(array_keys($weekly_bookings) as $week)
                {
                    foreach($weekly_bookings[$week] as $key=>$booking)
                    {
                        $weekly_bookingsByRoom[$week][$booking['room_id']][$key] = $booking;
                    }
                }
                return response(['data' => $weekly_bookingsByRoom , 'totalRecords' => $attendances['actual_count'],])
                    ->setStatusCode(RequestType::CODE_200);
            }

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
