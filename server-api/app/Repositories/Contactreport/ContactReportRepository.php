<?php

namespace Kinderm8\Repositories\Contactreport;

use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Carbon\Carbon;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Kinderm8\Child;
use Kinderm8\Room;
use Kinderm8\User;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Log;

class ContactReportRepository implements IContactReportRepository
{
    use UserAccessibility;
    private $userTimezone;
    private $today;
    private $first;

    public function __construct()
    {
        $this->userTimezone = (auth()->check())? auth()->user()->timezone : null;
        $this->today = strtolower(Carbon::now($this->userTimezone)->format('Y-m-d'));
        $this->first = '1900-01-01';
    }
    // public function __call($method, $args)
    // {
    //     return call_user_func_array([$this->child, $method], $args);
    // }

    /**
     * @param Request $request
     * @return Builder[]|Collection
     */
    public function getContactParentAndChildReport(Request $request, string $child_model)
    {

        try
        {

            if($request->input('filterBy') === 'CHILD') {
                $child_array =  [];
                $in_active_child = [];

                foreach($request->input('child') as $childList) {

                    $id = Helpers::decodeHashedID($childList);
                    array_push($child_array, $id);
                }
                //getting inActive child id
                if($request->input('status_toggle')) {

                    $in_active_child = $this->getInActiveChild($request, $child_model);
                }

                $child_array = array_merge($child_array,$in_active_child);

                $data = app()->make("Kinderm8\\{$child_model}")::with(['parents'])
                    ->whereIn('id', $child_array);

                $data = $this->attachAccessibilityQuery($data);


                $data = $data->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today]);

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('km8_child_profile.first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('km8_child_profile.last_name', 'asc');
                }


            }
            else {

                $room_array = [];
                foreach($request->input('room') as $roomList) {

                    $id = Helpers::decodeHashedID($roomList);
                    array_push($room_array, $id);
                }
                $data = app()->make("Kinderm8\\{$child_model}")::with(['parents'])->where('status', '=','1')
                    ->whereHas('rooms', function($query) use($room_array) {
                    $query->whereIn('id', $room_array);
                });

                if($request->input('status_toggle')) {

                        $data = app()->make("Kinderm8\\{$child_model}")::whereHas('rooms', function($query) use($room_array) {
                        $query->whereIn('id', $room_array);
                    });
                }

                $data = $this->attachAccessibilityQuery($data);

                $data = $data->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today]);

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('last_name', 'asc');
                }

            }

            $data = $this->getFormated($data->get());
            $actualCount = count($data);


        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $data,
            'actual_count' => $actualCount,
        ];

    }

    public function getFormated($children){

        $finalArray = [];
        $color = null;

        foreach($children as $child){

            $color = $color === '#fafafa' ? '#fafafa' : '#ffffff';

            foreach($child->parents as $parent) {

                $obj = [
                    'firstName' => $child->first_name,
                    'lastName' => $child->last_name,
                    'middleName' => $child->middle_name,
                    'room' => $this->getRoomData($child->rooms),
                    'joinDate' => DateTimeHelper::getDateFormat($child->join_date),
                    'dob' => DateTimeHelper::getDateFormat($child->dob),
                    'gender' => $child->gender ===  '0' ? 'Male' : 'Female',
                    'CRN' => $child->ccs_id,
                    'home_address' => $this->getChildFullAddress($child),
                    'attendance' => $this->getAttendance($child->attendance),
                    'parentsFirstName' => $parent->first_name,
                    'parentsLastName' => $parent->last_name,
                    'parentsHomeAddress' =>$this->getUserFullAddress($parent),
                    'parentsHomeDOB' => $parent->dob,
                    'parentsGender' => $parent->gender,
                    'parentsRelationship' => 'N\A',
                    'parentsPhoneNumber' => $parent->phone2,
                    'parentsMobile' => $parent->phone,
                    'parentsEmail' => $parent->email,
                    'parentsOccupation' => 'N\A',
                    'parentsAddress2' => $parent->address_2,
                    'parentsSecondaryEmail' => $parent->secondary_email,

                    'WorkParentsPhoneNumber' => $parent->work_phone,
                    'WorkParentsMobile' => $parent->work_mobile,
                    'pincode' => $parent->pincode,
                    'color' => $color
                    ];

                    array_push($finalArray, $obj);
            }
            $color = $color === '#ffffff' ? '#fafafa' : '#ffffff';

        }

        $color = null;

        return $finalArray;
    }

    public function getChildFullAddress($child)
    {
        $address = [];

        if (isset($child['home_address']) && !empty($child['home_address'])) {
        array_push($address, $child['home_address']);
        }

        if (isset($child['suburb']) && !empty($child['suburb'])) {
        array_push($address, $child['suburb']);
        }

        if (isset($child['state']) && !empty($child['state'])) {
        array_push($address, $child['state']);
        }

        if (isset($child['postalcode']) && !empty($child['postalcode'])) {
        array_push($address, $child['postalcode']);
        }

        return implode(', ', $address);
    }

    public function getUserFullAddress($user)
    {
        $address = [];

        if (isset($user['address_1']) && !empty($user['address_1'])) {
        array_push($address, $user['address_1']);
        }

        if (isset($user['address_2']) && !empty($user['address_2'])) {
        array_push($address, $user['address_2']);
        }

        if (isset($user['city']) && !empty($user['city'])) {
        array_push($address, $user['city']);
        }

        if (isset($user['state']) && !empty($user['state'])) {
        array_push($address, $user['state']);
        }

        if (isset($user['zip_code']) && !empty($user['zip_code'])) {
        array_push($address, $user['zip_code']);
        }

        return implode(', ', $address);
    }

    public function getRoomData($roomList) {
        $room_array = [];
        foreach($roomList as $att) {

            array_push($room_array, $att['title'] ? $att['title'] : 'N/A');

            }

         return $str_Names=implode(" | ", $room_array);
    }

    public function getAttendance($attendance)
    {
        $attendance_array = [];
        if($attendance === null || $attendance === '') {
            return '';
        }

        else{
            foreach($attendance as $att) {
                array_push($attendance_array,strtoupper(substr($att['name'], 0, 2)));
            }

             return $str_Names=implode(" | ", $attendance_array);
        }
    }

    public function ChildEmergencyContactsReport(Request $request, string $child_model, string $child_emergency_model, string $withParents = null)
    {

        try
        {

            if($request->input('filterBy') === 'CHILD') {
                $child_array =  [];
                $in_active_child = [];
                foreach($request->input('child') as $childList) {
                    $id = Helpers::decodeHashedID($childList);
                    array_push($child_array, $id);
                }

                //getting inActive child id
                if($request->input('status_toggle')) {

                    $in_active_child = $this->getInActiveChild($request, $child_model);
                }

                $child_array = array_merge($child_array,$in_active_child);

                $data = app()->make("Kinderm8\\{$child_model}")::with('emergencyContacts')
                    ->whereIn('id', $child_array)
                    ->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today]);

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('last_name', 'asc');
                }

            }
            else {
                $room_array = [];
                foreach($request->input('room') as $roomList) {
                    $id = Helpers::decodeHashedID($roomList);
                    array_push($room_array, $id);
                }

                $data = app()->make("Kinderm8\\{$child_model}")::with(['emergencyContacts'])
                ->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today])
                ->whereHas('rooms', function($query) use($room_array) {
                    $query->whereIn('id', $room_array);
                })
                ->where('status', '=','1');

                if($request->input('status_toggle')) {

                    $data = app()->make("Kinderm8\\{$child_model}")::with(['emergencyContacts'])
                    ->whereBetween('join_date', [$request->input('edate'), $request->input('sdate')])
                    ->whereHas('rooms', function($query) use($room_array) {
                        $query->whereIn('id', $room_array);
                    });
                }

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('last_name', 'asc');
                }

            }

            // Log::info($data->get());
            $data = $this->getFormatEmergency($data->get(), $withParents);
            $actualCount = count($data);

            // Log::info($data);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $data,
            'actual_count' => $actualCount,
        ];

    }

    public function getFormatEmergency($children, $withParents = null) {
        $emergency_data = [];
        $emergency_data2 = [];
        $color = null;
        foreach($children as $child) {
            $childsEmergency = [];
            $color = $color === '#fafafa' ? '#fafafa' : '#ffffff';




            foreach($child->emergencyContacts as $emergency_contacts){

                $obj = [
                    'id' => $child->id,
                    'firstName' => $child->first_name,
                    'lastName' => $child->last_name,
                    'middleName' => $child->middle_name,
                    'MobileNumberE' => $emergency_contacts->phone,
                    'eFirstName' => $emergency_contacts->first_name,
                    'eLastName' => $emergency_contacts->last_name,
                    'homeAddressE' => $emergency_contacts->address_1,
                    'phoneNumberE' => $emergency_contacts->phone2,
                    'workPhoneNumberE' => null,
                    'emailE' => $emergency_contacts->email === 'noreply@kinderm8.com.au' ? 'N/A' : $emergency_contacts->email,
                    'relationshipE' => $emergency_contacts->pivot->relationship,
                    'type' => $emergency_contacts->pivot->types,
                    'pincode' => $emergency_contacts->pincode,
                    'call_order' => ($emergency_contacts->pivot->call_order)? $emergency_contacts->pivot->call_order : 'N/A',
                    'color' => $color
                    ];

                    array_push($emergency_data, $obj);
                    array_push($childsEmergency, $obj);
            }

            usort($childsEmergency, function($a, $b) {
                if(array_key_exists("call_order",$a) && array_key_exists("call_order",$b))
                    return strnatcmp($a['call_order'], $b['call_order']);
            });

            $childParents = [];
            if($withParents && $withParents == 'true')
                foreach($child->parents as $parent){

                    $obj = [
                        'id' => $child->id,
                        'firstName' => $child->first_name,
                        'lastName' => $child->last_name,
                        'middleName' => $child->middle_name,
                        'MobileNumberE' => $parent->phone,
                        'eFirstName' => $parent->first_name,
                        'eLastName' => $parent->last_name,
                        'homeAddressE' => $parent->address_1,
                        'phoneNumberE' => $parent->phone2,
                        'workPhoneNumberE' => $parent->work_phone,
                        'emailE' => $parent->email === 'noreply@kinderm8.com.au' ? 'N/A' : $parent->email,
                        'relationshipE' => 'Parent',
                        'type' => 'Parent',
                        'pincode' => $parent->pincode,
                        'call_order' => ($parent->pivot->primary_payer) ? 'Primary Parent' : 'Secondary Parent',
                        'color' => $color
                    ];

                    array_push($emergency_data, $obj);
                    array_push($childParents, $obj);
                }
            usort($childParents, function($a, $b) {
                if(array_key_exists("call_order",$a) && array_key_exists("call_order",$b))
                    return strnatcmp($a['call_order'], $b['call_order']);
            });
            $childsEmergency = array_merge($childParents,$childsEmergency );

            $emergency_data2 = array_merge($emergency_data2, $childsEmergency);
            $color = $color === '#ffffff' ? '#fafafa' : '#ffffff';


        }

        return $emergency_data2;
    }

    public function educatorDetailsReport(Request $request, string $user_model, string $child_model, string $room_model)
    {

        try
        {

            if($request->input('filterBy') === 'CHILD') {
                $child_array =  [];
                $in_active_child = [];
                $child_to_room_id_array = [];
                foreach($request->input('child') as $childList) {
                    $id = Helpers::decodeHashedID($childList);
                    array_push($child_array, $id);
                }

                if($request->input('status_toggle')) {

                    $in_active_child = $this->getInActiveChild($request, $child_model);
                }

                $child_array = array_merge($child_array,$in_active_child);

                //get child room id
                $child_to_room_id = app()->make("Kinderm8\\{$child_model}")::with('rooms')
                            ->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today])
                            ->whereIn('id', $child_array)->get()
                            ->map(function($child){
                                return count($child->rooms) > 0 ? $child['rooms'][0]['id']: null;
                            });


                // get child user id
                $room_to_staff_id = app()->make("Kinderm8\\{$room_model}")::with('staff')
                                ->whereIn('id', $child_to_room_id)->get()
                                ->map(function($room){
                                    return count($room['staff']) > 0 ? $room['staff'][0]['id'] : null;
                                });

                $data = app()->make("Kinderm8\\{$user_model}")::Staff()
                            ->whereIn('id',$room_to_staff_id);

                $data = $data->where('organization_id',auth()->user()->organization_id)
                            ->where('branch_id',auth()->user()->branch_id)
                            ->orderBy('first_name')
                            ->get();

                // \Log::info($data);

            }
            else {
                $room_array = [];
                foreach($request->input('room') as $roomList) {
                    $id = Helpers::decodeHashedID($roomList);
                    array_push($room_array, $id);
                }
                // Log::info($room_array);

                $data = app()->make("Kinderm8\\{$user_model}")::Staff()->with(['rooms', 'child'])
                ->where('organization_id',auth()->user()->organization_id)
                ->where('branch_id',auth()->user()->branch_id)
                ->where('status', '=','0');

                if($request->input('status_toggle')) {

                    $data = app()->make("Kinderm8\\{$user_model}")::Staff()->with(['rooms', 'child'])
                    ->where('organization_id',auth()->user()->organization_id)
                    ->where('branch_id',auth()->user()->branch_id);
                }


                $data = $data->whereHas('rooms', function($query) use($room_array) {
                    $query->whereIn('id', $room_array);
                });

                $data = $data->where('created_at', '<', $request->input('sdate')?$request->input('sdate'):$this->today)
                        ->where('created_at', '>', $request->input('edate')? $request->input('edate'): $this->first)
                        ->orderBy('first_name')
                        ->get();
            }

            $data = $this->getFormatEducatorDetails($data);
            $actualCount = count($data);

            // Log::info($data);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $data,
            'actual_count' => $actualCount,
        ];

    }

    public function getFormatEducatorDetails($educators) {
        $staff_data = [];
        $color = null;
        foreach($educators as $user) {

            $obj = [
                'parentsFirstName' => $user->first_name,
                'parentsLastName' => $user->last_name,
                'parentsGender' => '',
                'dateJoinedUser' => DateTimeHelper::getDateFormat($user->created_at),
                'parentsHomeAddress' => $user->address1,
                'parentsPhoneNumber' => $user->phone2,
                ];

                array_push($staff_data, $obj);
        }

        return $staff_data;
    }

    public function getInActiveChild(Request $request, string $child_model){

        return app()->make("Kinderm8\\{$child_model}")::where('status', '=', '0')
                    ->where('branch_id',auth()->user()->branch_id)
                    ->pluck('id')
                    ->toArray();
    }


    public function viewPrimaryPayerReport(Request $request, string $child_model){

        try
        {

            if($request->input('filterBy') === 'CHILD') {
                $child_array =  [];
                $in_active_child = [];

                foreach($request->input('child') as $childList) {

                    $id = Helpers::decodeHashedID($childList);
                    array_push($child_array, $id);
                }
                //getting inActive child id
                if($request->input('status_toggle')) {

                    $in_active_child = $this->getInActiveChild($request, $child_model);
                }


                $child_array = array_merge($child_array,$in_active_child);

                $data = app()->make("Kinderm8\\{$child_model}")::with(['parents'])
                    ->whereIn('id', $child_array);

                $data = $this->attachAccessibilityQuery($data);

                $data = $data->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today]);

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('km8_child_profile.first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('km8_child_profile.last_name', 'asc');
                }
            }
            else {

                $room_array = [];
                foreach($request->input('room') as $roomList) {

                    $id = Helpers::decodeHashedID($roomList);
                    array_push($room_array, $id);
                }
                $data = app()->make("Kinderm8\\{$child_model}")::with(['parents'])->where('status', '=','1')
                    ->whereHas('rooms', function($query) use($room_array) {
                    $query->whereIn('id', $room_array);
                });

                if($request->input('status_toggle')) {

                        $data = app()->make("Kinderm8\\{$child_model}")::whereHas('rooms', function($query) use($room_array) {
                        $query->whereIn('id', $room_array);
                    });
                }

                $data = $this->attachAccessibilityQuery($data);

                $data = $data->whereBetween('join_date', [$request->input('edate')?$request->input('edate'): $this->first, $request->input('sdate')?$request->input('sdate'):$this->today]);

                if($request->input('sortby_toggle')=== 'first_name') {

                    $data = $data->orderBy('first_name', 'asc');
                }
                if($request->input('sortby_toggle')=== 'last_name'){

                    $data = $data->orderBy('last_name', 'asc');
                }

            }

            $data = $data->get();
            $actualCount = count($data);


        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $data->load('parents'),
            'actual_count' => $actualCount,
        ];


    }
}
