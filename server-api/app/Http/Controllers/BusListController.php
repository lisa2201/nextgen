<?php

namespace Kinderm8\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Child;
use Kinderm8\Bus;
use Kinderm8\ChildSchoolBus;
use Illuminate\Support\Facades\Crypt;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\BusListBookingResourceCollection;
use Kinderm8\Http\Resources\BusResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\SchoolResourceCollection;
use Kinderm8\Http\Resources\BusAttendanceResourceCollection;
use Kinderm8\Repositories\Bus\IBusListRepository;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\School\ISchoolRepository;
use RequestHelper;
use LocalizationHelper;
use Carbon\Carbon;
use DB;
use ErrorHandler;
use Helpers;
use Kinderm8\School;
use Log;

class BusListController extends Controller
{

    private $busListRepo;
    private $schoolListRepo;
    private $bookingRepo;
    private $snsService;

    public function __construct(IBusListRepository $busListRepo, ISchoolRepository $schoolListRepo, IBookingRepository $bookingRepo, SNSContract $SNSService)
    {
        $this->busListRepo = $busListRepo;
        $this->schoolListRepo = $schoolListRepo;
        $this->bookingRepo = $bookingRepo;
        $this->snsService = $SNSService;
    }

    public function getBusList(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->busListRepo->get([], $request);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new BusResourceCollection($data['list'],[ 'basic' => true ]))
            ->additional([
                'totalRecords' => $data['totalRecords'],
                'displayRecord' => $data['displayRecord'],
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getSchoolBusses(Request $request)
    {
        $school = (! Helpers::IsNullOrEmpty($request->input('schoolID'))) ? Helpers::decodeHashedID($request->input('schoolID')) : null;

        $data = [];
        try
        {
            $data = $this->busListRepo->get(
                [ 'schoolID' => $school],
                $request
            );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new BusResourceCollection($data['list'],[ 'basic' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getChildrenBySchool(Request $request)
    {
        $school = (! Helpers::IsNullOrEmpty($request->input('schoolID'))) ? Helpers::decodeHashedID($request->input('schoolID')) : null;

        $data = [];
        try
        {
            $data = $this->busListRepo->getChildrenBySchool(
                [ 'schoolID' => $school],
                $request
            );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new ChildResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getChildrenAndSchoolsByBus(Request $request)
    {
        /* for a bus ID, get all children assinged to that bus and all schools that bus is related to */
        $bus = (! Helpers::IsNullOrEmpty($request->input('busID'))) ? Helpers::decodeHashedID($request->input('busID')) : null;

        $data = [];
        try
        {
            $data = $this->busListRepo->getChildrenAndSchoolsByBus(
                [ 'busID' => $bus],
                $request
            );
            $bus = Bus::find($bus);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return
            response(['data' => new ChildResourceCollection($data), 'schools' => new SchoolResourceCollection($bus->school, [ 'basic' => true ])])
            ->setStatusCode(RequestType::CODE_200);
    }

    public function createBus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $bus = $this->busListRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $bus->id
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            \Log::info($e);
        }
    }

    public function updateBus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $id = $request->input('bus_id');
            $bus = $this->busListRepo->update(Helpers::decodeHashedID($id), $request);
            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $bus->id
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            \Log::info($e);
        }
    }

    public function deleteBus(Request $request)
    {

        $id = $request->input('bus')['id'];
        DB::beginTransaction();
        try {
            $this->busListRepo->delete(Helpers::decodeHashedID($id));

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

            \Log::info($e);
        }
    }

    public function getSchoolList(Request $request)
    {
        $data = [];

        try
        {
            $data = $this->schoolListRepo->get(
                [],
                $request
            );
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new SchoolResourceCollection($data['list'],[ 'basic' => true ]))
            ->additional([
                'totalRecords' => $data['totalRecords'],
                'displayRecord' => $data['displayRecord'],
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function createSchool(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $bus = $this->schoolListRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $bus->id
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            \Log::info($e);
        }
    }

    public function updateSchool(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $id = $request->input('school_id');
            $bus = $this->schoolListRepo->update(Helpers::decodeHashedID($id), $request);
            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $bus->id
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            \Log::info($e);
        }
    }


    public function deleteSchool(Request $request)
    {

        $id = $request->input('school')['id'];

        DB::beginTransaction();
        try {
            $this->schoolListRepo->delete(Helpers::decodeHashedID($id));

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

            \Log::info($e);
        }
    }

    /*removed after the room id was also applied to buslit*/
    /*public function addChildrenToBus(Request $request)
    {
        $busID = $request->input('bus_id');
        $schoolID = $request->input('school_id');

        $childIDs = $request->input('child_id'); //array
        try{
            $this->busListRepo->addChildrenToBus($busID, $schoolID, $childIDs);
            DB::commit();

            //return the updated list of children in bus according to bus or school selected
            if($request->input('return_school_children'))
            {
                $data = $this->busListRepo->getChildrenBySchool(
                    [ 'schoolID' => Helpers::decodeHashedID($schoolID) ],
                    $request
                );
            }
            else
            {
                $data = $this->busListRepo->getChildrenAndSchoolsByBus(
                    [ 'busID' => Helpers::decodeHashedID($busID) ],
                    $request
                );
            }
            return (new ChildResourceCollection($data))
                ->additional([ 'message'=> LocalizationHelper::getTranslatedText('response.success_update')])
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollback();
            \Log::info($e);
        }

        DB::beginTransaction();
    }*/

    public function deviceGetBusList(Request $request)
    {
        try
        {
            $room = Helpers::decodeHashedID($request->input('room_id'));

            $child_to_bus = ChildSchoolBus::where('room_id', '=', $room)
                ->get();

            $busses = Bus::where('branch_id', '=', auth()->user()->branch_id)
                ->whereIn('id', $child_to_bus->pluck('bus_id'))
                ->orderBy('bus_name','asc')
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'successfull',
                    $busses
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

    }

    public function deviceGetSchoolChildrenByBus(Request $request)
    {
        $bus = Helpers::decodeHashedID($request->input('bus_id'));
        $room = Helpers::decodeHashedID($request->input('room_id'));

        $child_list = [];
        try
        {
            $child_to_bus = ChildSchoolBus::with('bus')
                ->where('bus_id', '=', $bus)
                ->where('room_id', '=', $room)
                ->get();

            $child_list = Child::whereIn('id', $child_to_bus->pluck('child_id'))
                ->where('status', '=', '1')
                ->get();

            $request['start'] = Carbon::now(auth()->user()->userTimezone)->format('Y-m-d');
            $request['end'] = Carbon::now(auth()->user()->userTimezone)->format('Y-m-d');

            $temp = array();
            foreach($child_list as $child){
                $child['bookings'] = $this->bookingRepo->get(
                    [ 'child' => $child->id, 'room' => $room],
                    ['attendance'],
                    $request,
                    false
                );

                if(count($child['bookings']) > 0){
                    array_push($temp, $child);
                }
            }
            $child_list = $temp;

            $schools = School::where('branch_id', '=', auth()->user()->branch_id)
                ->whereIn('id', $child_to_bus->pluck('school_id'))
                ->orderBy('school_name','asc')
                ->get();

            $temp = array();
            foreach($schools as $school){

                $tempChildren = array();
                foreach($child_list as $child){

                    if($child['school_bus'][0]['school_id'] === $school->id){
                        array_push($tempChildren, $child);
                    }
                }
                $school['children'] = $tempChildren ;

                if(count($tempChildren) > 0){
                    array_push($temp, $school);
                }
            }
            $schools = $temp;

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    'successfull',
                    $schools
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }

    }

    public function deviceGetBusAttendance(Request $request)
    {

        try {
            $attendances =  $this->busListRepo->getBusAttendance($request, 'ChildNote');

            return (new BusAttendanceResourceCollection($attendances,['withChild' => true, 'withBus' => true, 'withSchool' => true]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    // create drop and pick attendance
    public function deviceCreateBusAttendance(Request $request)
    {
        try {
            $response =  $this->busListRepo->createAttendance($request, 'School', 'ChildNote', 'ChildSchoolBus', 'Booking');

            if(count($response['attendance_ids']) > 0){

                // send sns if branch is connected to current gen (kinder connect)
                if(auth()->user()->branch->kinderconnect)
                {
                    $this->snsService->publishEvent(
                        Helpers::getConfig('kinder_connect_attendance', AWSConfigType::SNS),
                        [
                            'organization' => auth()->user()->organization_id,
                            'branch' => auth()->user()->branch_id,
                            'subjectid' => $response['attendance_ids'],
                            'action' => CurrentGenConnectType::ACTION_CREATE
                        ],
                        CurrentGenConnectType::ATTENDANCE_SUBJECT
                    );
                }

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        'successfully created'
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        $response['status']
                    ), RequestType::CODE_400);

            }

        } catch (Exception $e) {
            // ErrorHandler::log($e);
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
            log::info($e);
        }
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * @throws ServerErrorException
     */
    public function viewBusAttendanceReport(Request $request)
    {
        try
        {

            $attendances = $this->busListRepo->getBusAttendanceForReport(
                $request,
                'BusAttendance'
            );

            return (new BusAttendanceResourceCollection($attendances['list'], ['withChild' => true, 'withBus' =>true, 'withSchool' => true]))
                ->additional([
                    'totalRecords' => $attendances['actual_count'],
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);


        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function viewBusListReport(Request $request)
    {

        try
        {


            $attendances = $this->busListRepo->getBusListReport(
                $request,
                'Booking'
            );

            $arr = [];


            // group the attendance records by school ID
            foreach ($attendances['list'] as $key => $item) {
                $arr[$item['school_id']][$key] = $item;
            }
            // sort the grouped-by-school records according to alphabetized school name
            usort($arr, array($this,'cmpSchool'));
            $arr2 = [];

            // group the each schools records by child id
            foreach(array_keys($arr) as $school)
            {
                foreach($arr[$school] as $key=>$item)
                {
                    $arr2[$school][$item['child_id']][$key] = $item;
                }
            }
            // sort the each schools records according to alphabetized child name
            foreach ($arr2 as $key=>$element){

                usort($element, array($this, 'cmpChild'));
                $arr2[$key] = $element;
            }
            return response(['data' => $arr2, 'totalRecords' => $attendances['actual_count'],])
                ->setStatusCode(RequestType::CODE_200);



        }
        catch (Exception $e)
        {
            \Log::info($e);
        }
    }

    function cmpSchool($a, $b) {
        /*\Log::info("First Element of A");
        \Log::info(array_key_first($a));
        \Log::info("First Element of B");
        \Log::info(array_key_first($b));*/
        return strcmp($a[array_key_first($a)]->school_name, $b[array_key_first($b)]->school_name);
    }

    function cmpChild($a, $b) {

        return strcmp($a[array_key_first($a)]->child->last_name, $b[array_key_first($b)]->child->last_name);
    }
}


