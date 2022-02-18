<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\BookingImportMigrateRequest;
use Kinderm8\Http\Requests\BookingImportRequest;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use LocalizationHelper;
use RequestHelper;

ignore_user_abort(true);
set_time_limit(0);

class BookingDataMigrationController extends Controller
{
    private $childRepo;
    private $feeRepo;
    private $organizationRepo;
    private $branchRepo;
    private $roomRepo;
    private $bookingRepo;

    public function __construct(IChildRepository $childRepo, IFeeRepository $feeRepo, IOrganizationRepository $organizationRepo, IBranchRepository $branchRepo, IRoomRepository $roomRepo, IBookingRepository $bookingRepo)
    {
        $this->childRepo = $childRepo;
        $this->feeRepo = $feeRepo;
        $this->organizationRepo = $organizationRepo;
        $this->branchRepo = $branchRepo;
        $this->roomRepo = $roomRepo;
        $this->bookingRepo = $bookingRepo;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $response = [
                'orgs' => new OrganizationResourceCollection($this->organizationRepo->with(['branch'])->get(), [ 'withBranch' => true ])
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
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
     * @throws ValidationException
     */
    public function getBookings(Request $request)
    {
        try
        {
            // validation
            app(BookingImportRequest::class);

            $org = (! Helpers::IsNullOrEmpty($request->input('org'))) ? Helpers::decodeHashedID($request->input('org')) : null;
            $branch = (! Helpers::IsNullOrEmpty($request->input('branch'))) ? Helpers::decodeHashedID($request->input('branch')) : null;
            $bookings = ($request->input('bookings') !== '') ? $request->input('bookings') : null;

            $optional_include_history = (! Helpers::IsNullOrEmpty($request->input('history'))) ? filter_var($request->input('history'), FILTER_VALIDATE_BOOLEAN) : false;

            // check if all has enrollment end date
            if (!$optional_include_history && count(array_filter($bookings, function ($item) { return !Helpers::IsNullOrEmpty($item['enrolment_end']); })) === count($bookings))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('import-operations.booking_has_enrolment_end_date')
                    ), RequestType::CODE_404);
            }

            // get branch
            $branchObj = $this->branchRepo->findById($branch);

            // get data
            $children = $this->childRepo->get([ 'org' => $org, 'branch' => $branchObj->id ], [ 'rooms', ], $request,false);
            $fees = $this->feeRepo->get([ 'org' => $org, 'branch' => $branchObj->id ], [], $request, false);
            $rooms = $this->roomRepo->get([ 'org' => $org, 'branch' => $branchObj->id ], [], $request, false);

            // check if data available
            if ($children->isEmpty() || $fees->isEmpty() || $rooms->isEmpty())
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('import-operations.resources_not_found')
                    ), RequestType::CODE_404);
            }

            // map bookings
            $formatList = [];

            foreach ($bookings as $key => $booking)
            {
                if ((!$optional_include_history && ! Helpers::IsNullOrEmpty($booking['enrolment_end']))
                    || ($optional_include_history && Helpers::IsNullOrEmpty($booking['enrolment_end']))
                    || Helpers::IsNullOrEmpty($booking['week_schedule']))
                {
                    continue;
                }

                $child = !Helpers::IsNullOrEmpty($booking['crn']) ? $children->filter(function ($item) use ($booking) { return $item->ccs_id === $booking['crn']; })->first() : null;
                $room = !Helpers::IsNullOrEmpty($booking['room']) ? $rooms->filter(function ($item) use ($booking) { return $item->id === (int) $booking['room']; })->first() : null;
                $fee = !Helpers::IsNullOrEmpty($booking['fee']) ? $fees->filter(function ($item) use ($booking) { return $item->id === (int) $booking['fee']; })->first() : null;

                $booking_start_date = Carbon::parse(DateTimeHelper::cleanDateFormat($booking['enrolment_start']));
                $booking_end_date = !$optional_include_history
                    ? Carbon::parse(DateTimeHelper::cleanDateFormat($booking['dob']))->addYears(5)
                    : Carbon::parse(DateTimeHelper::cleanDateFormat($booking['enrolment_end']));

                $booking['room'] = !Helpers::IsNullOrEmpty($booking['room']) ? Helpers::hxCode($booking['room']) : null;
                $booking['fee'] = !Helpers::IsNullOrEmpty($booking['fee']) ? Helpers::hxCode($booking['fee']) : null;

                array_push($formatList, [
                    'response' => $booking,
                    'child' => !is_null($child) ? $child->index : null,
                    'room' => !is_null($room) ? $room->index : null,
                    'fee' => !is_null($fee) ? $fee->index : null,
                    'schedule' => DateTimeHelper::mapWeekDays(array_filter(explode(' ', $booking['week_schedule']))),
                    'booking_start' => $booking_start_date->format('Y-m-d'),
                    'booking_end' => $booking_end_date->format('Y-m-d')
                ]);

                unset($booking_start_date);
                unset($booking_end_date);
            }

            $response = [
                'children' => new ChildResourceCollection($children),
                'fees' => new FeesResourceCollection($fees),
                'rooms' => new RoomResourceCollection($rooms),
                'list' => $formatList
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function migrateBookings(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BookingImportMigrateRequest::class);

            // get branch
            $branchObj = $this->branchRepo
                ->where('organization_id', Helpers::decodeHashedID($request->input('org')))
                ->where('id', Helpers::decodeHashedID($request->input('branch')))
                ->first();

            $this->bookingRepo->migrate($request, $branchObj, auth()->user());

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_migration')
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e->getPrevious());
        }
    }
}
