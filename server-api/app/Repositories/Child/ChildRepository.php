<?php

namespace Kinderm8\Repositories\Child;

use Carbon\Carbon;
use CCSHelpers;
use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\Child;
use Kinderm8\ChildDocuments;
use Kinderm8\ChildSchoolBus;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Log;

class ChildRepository implements IChildRepository
{
    use UserAccessibility;

    private $child;

    public function __construct(Child $child)
    {
        $this->child = $child;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->child, $method], $args);
    }

    /**
     * @param array $args
     * @param array $depends
     * @param Request $request
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        //query builder
        $child_list = $this->child
            ->with((!empty($depends)) ? $depends : ['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'active_ccs_enrolment'])
            ->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');

        // for session submission read
        if (in_array('session_ccs_enrolment', $depends))
        {
            $child_list->whereHas('session_ccs_enrolment', function ($query) use ($request)
            {
                $query->whereIn('status', CCSHelpers::getValidEnrolmentStatusForSubmission())
                    ->whereNotNull('enrolment_id');

                if (! Helpers::IsNullOrEmpty($request->input('start')))
                {
                    $query->where('enrollment_start_date', '<=', Carbon::parse($request->input('start'))->format('Y-m-d'));
                }
            });
        }

        //access
        $child_list = $this->attachAccessibilityQuery($child_list, null, 'km8_child_profile');

        if ($withTrashed)
        {
            $child_list->withTrashed();
        }

        if (is_array($args) && !empty($args))
        {
            $child_list
                /*->when(isset($args['start_date_validation']), function ($query) use ($args)
                {
                    return $query->whereNotNull('join_date')->whereNotNull('enrollment_start_date');
                })*/
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('km8_child_profile.organization_id', $args['org']);
                })
                ->when(isset($args['branch']) && !is_null($args['branch']), function ($query) use ($args)
                {
                    return $query->where('km8_child_profile.branch_id', $args['branch']);
                })
                ->when(isset($args['reference']) && !is_null($args['reference']), function ($query) use ($args)
                {
                    return is_array($args['reference']) ? $query->whereIn('km8_child_profile.id', $args['reference']) : $query->where('km8_child_profile.id', $args['reference']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('km8_child_profile.status', $args['status']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy("km8_child_profile.{$args['order']['column']}", $args['order']['value']);
                });
        }
        // default
        else
        {
            $child_list->orderBy('km8_child_profile.first_name', 'asc');
        }

        //get actual count
        return $child_list
            ->select(['km8_child_profile.*', 'km8_organization_branch.name'])
            ->groupBy('km8_child_profile.id', 'km8_organization_branch.name')
            ->get();
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function list(array $args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int)$request->input('offset') : 10;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $child_list = $this->child->join('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_child_profile.branch_id');

            //access
            $child_list = $this->attachAccessibilityQuery($child_list, null, 'km8_child_profile');

            //get actual count
            $actualCount = $child_list
                ->select(['km8_child_profile.*', 'km8_organization_branch.name'])
                ->groupBy('km8_child_profile.id', 'km8_organization_branch.name')
                ->get()
                ->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters->status))
                {
                    $child_list->where('km8_child_profile.status', '=', $filters->status === '0' ? '0' : '1');
                }

                if (isset($filters->gender) && $filters->gender !== '')
                {
                    $child_list->where('km8_child_profile.gender', '=', $filters->gender);
                }

                if (isset($filters->date_of_birth) && !is_null($filters->date_of_birth))
                {
                    $child_list->where('km8_child_profile.dob', $filters->date_of_birth);
                }

                if (isset($filters->room) && !is_null($filters->room))
                {
                    $room_id = Helpers::decodeHashedID($filters->room);

                    $child_list->whereHas('rooms', function ($query) use ($room_id)
                    {
                        $query->where('room_id', $room_id);
                    });
                }

                if (isset($filters->user) && !is_null($filters->user))
                {
                    $user_id = Helpers::decodeHashedID($filters->user);

                    $child_list->whereHas('parents', function ($query) use ($user_id)
                    {
                        $query->where('user_id', $user_id);
                    });
                }

                if (isset($filters->ccs_filter) && !is_null($filters->ccs_filter))
                {
                    $child_list->whereHas('ccs_enrolment', function ($query) use ($filters)
                    {
                        $query->latest()->where('status', $filters->ccs_filter);
                    });
                }
                //parent approved status filter
                if (isset($filters->parent_confirmation_ccs_filter) && !is_null($filters->parent_confirmation_ccs_filter))
                {
                    $child_list->whereHas('ccs_enrolment', function ($query) use ($filters)
                    {
                        $query->latest()->where('parent_status', $filters->parent_confirmation_ccs_filter);
                    });
                }
            }
            // default show active
            else
            {
                $child_list->where('km8_child_profile.status', '1');
            }

            //search
            if (!is_null($searchValue))
            {
                $searchList = [
                    'km8_child_profile.first_name',
                    'km8_child_profile.last_name',
                    'km8_child_profile.middle_name',
                    'km8_child_profile.dob'
                ];

                if (!empty($searchList))
                {
                    $child_list->whereLike($searchList, $searchValue);
                }
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            {
                /*$user_list->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );*/
            }
            else
            {
                $child_list->orderBy('km8_child_profile.first_name', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[0]);
            }

            $child_list = $child_list
                ->select(['km8_child_profile.*', 'km8_organization_branch.name'])
                ->groupBy('km8_child_profile.id', 'km8_organization_branch.name')
                ->paginate($offset);

            // load relationships after pagination
            $child_list->load(['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'cultural_details', 'emergencyContacts', 'ccs_enrolment']);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $child_list = [];
        }

        return [
            'list' => $child_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    /**
     * @param Request $request
     * @return Child
     */
    public function store(Request $request)
    {
        $childAcc = new $this->child;

        $childAcc->organization_id = auth()->user()->organization_id;
        $childAcc->branch_id = auth()->user()->branch_id;
        $childAcc->created_by = auth()->user()->id;

        $childAcc->first_name = $request->input('f_name');
        $childAcc->last_name = $request->input('l_name');
        $childAcc->gender = $request->input('gender');
        $childAcc->join_date = $request->input('join_date');
        $childAcc->dob = $request->input('dob');
        $childAcc->attendance = DateTimeHelper::getDaysInWeek($request->input('attendance'));
        $childAcc->child_description = (!Helpers::IsNullOrEmpty($request->input('desc'))) ? $request->input('desc') : null;
        $childAcc->bottle_feed_option_required = (!Helpers::IsNullOrEmpty($request->input('bottle_feed')) && $request->input('bottle_feed')) ? '1' : '0';
        $childAcc->nappy_option_required = (!Helpers::IsNullOrEmpty($request->input('nappy')) && $request->input('nappy')) ? '1' : '0';
        $childAcc->status = $request->input('status');

        $childAcc->save();

        return $childAcc;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $child = $this->child->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends)) {
            $child->with($depends);
        }

        $child = $child->first();

        if (is_null($child))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $child;
    }

    /**
     * @param Request $request
     * @param array $args
     * @param Model|null $user
     * @param bool $withTrashed
     * @return Builder[]|Collection|mixed[]
     */
    public function findChildrenByParent(Request $request, array $args, ?Model $user, bool $withTrashed)
    {
        $child_list = $this->child
            ->with('parents')
            ->whereHas('parents', function ($query) use ($user)
            {
                $query->where('user_id', $user->id);
            })
            ->when($withTrashed, function ($query)
            {
                return $query->withTrashed();
            });

        if (is_array($args) && !empty($args))
        {
            $child_list
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                });
        }

        return $child_list->get();
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $cultural_model
     * @return Child
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     */
    public function update(string $id, Request $request, string $cultural_model)
    {
        $childAcc = $this->findById($id, ['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment']);

        $childAcc->first_name = $request->input('f_name');
        $childAcc->middle_name = (!Helpers::IsNullOrEmpty($request->input('m_name'))) ? $request->input('m_name') : null;
        $childAcc->last_name = $request->input('l_name');

        $childAcc->legal_first_name = (! Helpers::IsNullOrEmpty($request->input('legal_first_name'))) ? $request->input('legal_first_name') : null;
        $childAcc->legal_last_name = (! Helpers::IsNullOrEmpty($request->input('legal_last_name'))) ? $request->input('legal_last_name') : null;

        $childAcc->gender = $request->input('gender');
        $childAcc->dob = $request->input('dob');
        $childAcc->join_date = (!Helpers::IsNullOrEmpty($request->input('join'))) ? $request->input('join') : null;
        $childAcc->attendance = DateTimeHelper::getDaysInWeek($request->input('attendance'));
        $childAcc->child_description = (!Helpers::IsNullOrEmpty($request->input('desc'))) ? $request->input('desc') : null;
        $childAcc->bottle_feed_option_required = (!Helpers::IsNullOrEmpty($request->input('bottle_feed')) && $request->input('bottle_feed')) ? '1' : '0';
        $childAcc->nappy_option_required = (!Helpers::IsNullOrEmpty($request->input('nappy')) && $request->input('nappy')) ? '1' : '0';
        $childAcc->status = $request->input('status');
        $childAcc->ccs_id = (!Helpers::IsNullOrEmpty($request->input('crn'))) ? $request->input('crn') : null;
        $childAcc->home_address = $request->input('home_address');
        $childAcc->suburb = $request->input('suburb');
        $childAcc->state = $request->input('state');
        $childAcc->postalcode = $request->input('postalcode');
        $childAcc->court_orders = $request->input('court_orders');

        $childAcc->save();

        /* check if child is deactivated
            if yes, check if the parents should be deactivated too.
        */
        if ($request->input('status') == '0') {
            /* for each parent of that child */
            foreach ($childAcc->parents as $parent) {
                $parentHasNoOtherActiveChildren = true;

                /* go through that parents other children */
                foreach ($parent->child as $otherChild) {
                    /* check if the child is active */
                    if ($otherChild->status == '1') {
                        /* parent has a active child, 'parent has no other active children' becomes false*/
                        $parentHasNoOtherActiveChildren = false;
                    }
                }
                /* check if 'parent has no other active children' is true */
                if ($parentHasNoOtherActiveChildren) {
                    /* deactivate the parent */
                    $parent->update(['status' => 1]);
                }
            }
        }
        /* check if child is activated */
        /* if yes, activate the childs all parents*/
        if ($request->input('status') == '1') {
            foreach ($childAcc->parents as $parent) {
                $parent->update(['status' => 0]);
            }
        }

        //attach rooms
        $childAcc->rooms()->sync(Helpers::decodeHashedID($request->input('rooms')));

        //attach users
        $childAcc->parents()->sync(Helpers::decodeHashedID($request->input('users')));

        //update cultural details
        $culturalInput = $request->input('cultural'); //get child's cultural details
        $culturalDetails = app()->make("Kinderm8\\{$cultural_model}")
            ->where('child_id', $childAcc->id)
            ->get()
            ->first();

        if (is_null($culturalDetails)) {
            $culturalDetails = app()->make("Kinderm8\\{$cultural_model}");
            $culturalDetails->child_id = Helpers::decodeHashedID($request->input('id'));
        }

        $culturalDetails->ab_or_tsi = (isset($culturalInput['ab_or_tsi'])) ? $culturalInput['ab_or_tsi'] : null;
        $culturalDetails->cultural_background = (isset($culturalInput['cultural_background'])) ? $culturalInput['cultural_background'] : null;
        $culturalDetails->language = (isset($culturalInput['language'])) ? $culturalInput['language'] : null;
        $culturalDetails->cultural_requirements_chk = (isset($culturalInput['cultural_requirements_chk']) && $culturalInput['cultural_requirements_chk'] == true) ? '1' : '0';
        $culturalDetails->cultural_requirements = (isset($culturalInput['cultural_requirements'])) ? $culturalInput['cultural_requirements'] : null;
        $culturalDetails->religious_requirements_chk = (isset($culturalInput['religious_requirements_chk']) && $culturalInput['religious_requirements_chk'] == true) ? '1' : '0';
        $culturalDetails->religious_requirements = (isset($culturalInput['religious_requirements'])) ? $culturalInput['religious_requirements'] : null;

        $culturalDetails->save();

        // profile picture update
        $profilepictureinput = $request->input('upload_file');

        if ($profilepictureinput) {
            $childDocuments = ChildDocuments::where('child_id', Helpers::decodeHashedID($request->input('id')))->get()->first();
            if ($childDocuments) {
                $childDocuments->child_profile_image = $profilepictureinput['childImage'][0];
                $childDocuments->save();
            } else {
                $childDocuments = new ChildDocuments();
                $childDocuments->child_id = Helpers::decodeHashedID($request->input('id'));
                $childDocuments->child_profile_image = $profilepictureinput['childImage'][0];
                $childDocuments->save();
            }
            $childAcc->child_profile_image = $profilepictureinput['childImage'][0];
            $childAcc->save();
        }

        // school and bus update // removed after room id update
        /*$childSchoolandBus = ChildSchoolBus::where('child_id', Helpers::decodeHashedID($request->input('id')))->withTrashed()->get()->first();
        if((!Helpers::IsNullOrEmpty($request->input('bus'))) || (!Helpers::IsNullOrEmpty($request->input('school'))))
        {
            if($childSchoolandBus){
                $childSchoolandBus->bus_id = (!Helpers::IsNullOrEmpty($request->input('bus'))) ? Helpers::decodeHashedID($request->input('bus')) : null;
                $childSchoolandBus->school_id = (!Helpers::IsNullOrEmpty($request->input('school'))) ? Helpers::decodeHashedID($request->input('school')) : null;
                $childSchoolandBus->save();
            }
            else{
                $childSchoolandBus = new ChildSchoolBus();
                $childSchoolandBus->child_id = Helpers::decodeHashedID($request->input('id'));
                $childSchoolandBus->bus_id = (!Helpers::IsNullOrEmpty($request->input('bus'))) ? Helpers::decodeHashedID($request->input('bus')) : null;
                $childSchoolandBus->school_id = (!Helpers::IsNullOrEmpty($request->input('school'))) ? Helpers::decodeHashedID($request->input('school')) : null;
                $childSchoolandBus->save();
            }
        }
        else
        {
            if($childSchoolandBus)
            {
                $childSchoolandBus->forceDelete();
            }
        }*/

        return $childAcc;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $child = $this->findById($id, ['parents']);

        if ($child->deleted_at != null) {
            $child->forceDelete();
        } else {
            $child->delete();

            /* check if the parent has other children. if not, deactivate the parent. */
            foreach ($child->parents as $parent) {
                if ($parent->child->isEmpty()) {
                    $parent->update(['status' => 1]);
                }
            }
        }

        return true;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $type
     * @return Child
     * @throws ResourceNotFoundException
     */
    public function updateUsers(string $id, Request $request, string $type)
    {
        $user_id = Helpers::decodeHashedID($request->input('user'));

        $childObj = $this->findById($id, ['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'cultural_details', 'ccs_enrolment']);

        if (is_null($childObj) || is_null($type)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        if ($type === RequestType::ACTION_TYPE_NEW) {

            $childObj->parents()->attach($user_id);

            if ($request->input('primary_payer') === true) {
                $this->setPrimaryPayer($id, $user_id);
            }

        } else {
            $childObj->parents()->detach($user_id);
        }

        $childObj->load(['parents', 'parents.child']);

        return $childObj;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $type
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateRooms(string $id, Request $request, string $type)
    {
        $room_id = Helpers::decodeHashedID($request->input('room'));

        $childObj = $this->findById($id, ['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'cultural_details', 'ccs_enrolment']);

        if (is_null($childObj) || is_null($type)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        ($type === RequestType::ACTION_TYPE_NEW)
            ? $childObj->rooms()->attach($room_id)
            : $childObj->rooms()->detach($room_id);

        $childObj->load(['rooms']);

        return $childObj;
    }

    /**
     * @param string $id
     * @param Request $request
     * @param string $type
     * @param string $user_model
     * @param string $emergency_contact_model
     * @return Child
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     */
    public function updateEmergencyContact(string $id, Request $request, string $type, string $user_model, string $emergency_contact_model)
    {
        $user_id = Helpers::decodeHashedID($request->input('user'));

        $childObj = $this->findById($id, []);

        if (is_null($childObj) || is_null($type)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $user = app()->make("Kinderm8\\{$user_model}")->find($user_id);

        if (is_null($user)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $new_emergencyObj = app()->make("Kinderm8\\{$emergency_contact_model}");

        $new_emergencyObj->child_profile_id = $id;
        $new_emergencyObj->user_id = $user_id;
        $new_emergencyObj->first_name = $user->first_name;
        $new_emergencyObj->last_name = $user->last_name;
        $new_emergencyObj->address = $user->address_1;
        $new_emergencyObj->email = $user->email;
        $new_emergencyObj->phone = $user->phone;
        $new_emergencyObj->phone2 = $user->phone2;
        $new_emergencyObj->relationship = 'Emergency Contact';
        $new_emergencyObj->types = [];
        $ecContactConsents = [
            'consent_incursion' => false,
            'consent_make_medical_decision' => false,
            'consent_emergency_contact' => false,
            'consent_collect_child' => false
        ];
        $new_emergencyObj->consents = $ecContactConsents;
        $new_emergencyObj->save();

        return $childObj;
    }

    /**
     * @param string $id
     * @param string $value
     * @return bool
     */
    public function setCRN(string $id, string $value)
    {
        $this->child
            ->where('id', $id)
            ->update(['ccs_id' => $value]);

        return true;
    }

    /**
     * @param Request $request
     * @param string $childAttendance_model
     * @return mixed
     * @throws BindingResolutionException
     * @throws ResourceNotFoundException
     */
    public function getAttendance(Request $request, string $childAttendance_model)
    {
        $child_id = $request->input('child_id');

        $child = $this->findById($child_id, []);

        $child['attendances'] = app()->make("Kinderm8\\{$childAttendance_model}")
            ->where('child_id', $child_id)
            ->where('date', strtolower(now()->format('Y-m-d')))
            ->get();

        return $child;
    }

    /**
     * @param int $id
     * @param int $user_id
     * @return Child
     * @throws ResourceNotFoundException
     */
    public function setPrimaryPayer(int $id, int $user_id)
    {
        $childObj = $this->findById($id, ['creator', 'rooms', 'parents', 'parents.child', 'emergency', 'cultural_details', 'ccs_enrolment']);

        $parent_ids = $childObj->parents()->pluck('id');

        // Disable all parent flags for this child
        $childObj->parents()->updateExistingPivot($parent_ids, ['primary_payer' => false]);

        // Enable for the user
        $childObj->parents()->updateExistingPivot($user_id, ['primary_payer' => true]);

        $childObj->load(['parents.child']);

        return $childObj;
    }

    /**
     * @param int $id
     * @param int $user_id
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function setEmergencyContact(int $id, int $user_id, Request $request)
    {
        $childObj = $this->findById($id, []);

        $consentEmergencyContact = Helpers::IsNullOrEmpty($request->input('consentEmergencyContact')) ? false : true;
        $consentCollectChild = Helpers::IsNullOrEmpty($request->input('consentCollectChild')) ? false : true;
        $consentMakeMedicalDecision = Helpers::IsNullOrEmpty($request->input('consentMakeMedicalDecision')) ? false : true;
        $consentIncursion = Helpers::IsNullOrEmpty($request->input('consentIncursion')) ? false : true;
        $consentDropOffAndPickUp = Helpers::IsNullOrEmpty($request->input('consentDropOffAndPickUp')) ? false : true;
        $consentTransportationArrange = Helpers::IsNullOrEmpty($request->input('consentTransportationArrange')) ? false : true;

        $types = [];

        if ($consentEmergencyContact) {
            array_push($types, 'Emergency');
        }

        if ($consentCollectChild) {
            array_push($types, 'Collection');
        }

        if ($consentMakeMedicalDecision) {
            array_push($types, 'Medical');
        }

        if ($consentIncursion) {
            array_push($types, 'Excursion');
        }

        if ($consentDropOffAndPickUp) {
            array_push($types, 'DropOffPickUp');
        }

        if ($consentTransportationArrange) {
            array_push($types, 'Transportation');
        }

        $consents = [
            'consent_incursion' => $consentIncursion,
            'consent_make_medical_decision' => $consentMakeMedicalDecision,
            'consent_emergency_contact' => $consentEmergencyContact,
            'consent_collect_child' => $consentCollectChild,
            'consent_drop_off_and_pick_up_child' => $consentDropOffAndPickUp,
            'consent_transportation' => $consentTransportationArrange
        ];

        $relationship = Helpers::IsNullOrEmpty($request->input('relationship')) ? null : $request->input('relationship');
        $callOrder = Helpers::IsNullOrEmpty($request->input('call_order')) ? null : (int)$request->input('call_order');

        $attach_data = [
            'address' =>$request->input('address'),
            'relationship' => $relationship,
            'types' => $types,
            'consents' => $consents,
            'first_name' => $request['firstname'],
            'last_name' => $request['lastname'],
            'email' => $request['email'],
            'phone' => $request['phone'],
            'phone2' => $request['phone2'],
            'address' => $request['address1'],
            'call_order' => $callOrder,
        ];
        $childObj->emergencyContacts()->attach($user_id, $attach_data);

        return $childObj;

    }

    /**
     * @param int $id
     * @param int $user_id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function detachEmergencyContact(int $id, int $user_id)
    {

        $childObj = $this->findById($id, []);

        $childObj->emergencyContacts()->detach($user_id);

        return $childObj;

    }

    public function getChildIdInRoom(Request $request)
    {

        $child_id = [];
        if($request->input('status_toggle')){

            $child_id = $this->child->whereHas('rooms', function($query)use ($request){
                $query->whereIn('id', Helpers::decodeHashedID($request->input('room')));
            })
            ->pluck('id')
            ->toArray();

        }
        else{

            $child_id = $this->child->whereHas('rooms', function($query)use ($request){

                $query->whereIn('id', Helpers::decodeHashedID($request->input('room')));
            })
            ->where('status', '=', '1')
            ->pluck('id')
            ->toArray();

        }

        return $child_id;
    }

    public function updateParentLogin(string $id, Request $request, string $cultural_model)
    {
        $childAcc = $this->findById($id, ['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment']);

        $childAcc->first_name = $request->input('f_name');
        $childAcc->middle_name = (!Helpers::IsNullOrEmpty($request->input('m_name'))) ? $request->input('m_name') : null;
        $childAcc->last_name = $request->input('l_name');

        $childAcc->legal_first_name = (! Helpers::IsNullOrEmpty($request->input('legal_first_name'))) ? $request->input('legal_first_name') : null;
        $childAcc->legal_last_name = (! Helpers::IsNullOrEmpty($request->input('legal_last_name'))) ? $request->input('legal_last_name') : null;
        $childAcc->ccs_id = (!Helpers::IsNullOrEmpty($request->input('crn'))) ? $request->input('crn') : null;

        $childAcc->suburb = $request->input('suburb');
        $childAcc->state = $request->input('state');
        $childAcc->postalcode = $request->input('postalcode');

        $childAcc->save();

        //update cultural details
        $culturalInput = $request->input('cultural'); //get child's cultural details
        $culturalDetails = app()->make("Kinderm8\\{$cultural_model}")
            ->where('child_id', $childAcc->id)
            ->get()
            ->first();

        if (is_null($culturalDetails)) {
            $culturalDetails = app()->make("Kinderm8\\{$cultural_model}");
            $culturalDetails->child_id = Helpers::decodeHashedID($request->input('id'));
        }

        $culturalDetails->ab_or_tsi = (isset($culturalInput['ab_or_tsi'])) ? $culturalInput['ab_or_tsi'] : null;
        $culturalDetails->cultural_background = (isset($culturalInput['cultural_background'])) ? $culturalInput['cultural_background'] : null;
        $culturalDetails->language = (isset($culturalInput['language'])) ? $culturalInput['language'] : null;
        $culturalDetails->cultural_requirements_chk = (isset($culturalInput['cultural_requirements_chk']) && $culturalInput['cultural_requirements_chk'] == true) ? '1' : '0';
        $culturalDetails->cultural_requirements = (isset($culturalInput['cultural_requirements'])) ? $culturalInput['cultural_requirements'] : null;
        $culturalDetails->religious_requirements_chk = (isset($culturalInput['religious_requirements_chk']) && $culturalInput['religious_requirements_chk'] == true) ? '1' : '0';
        $culturalDetails->religious_requirements = (isset($culturalInput['religious_requirements'])) ? $culturalInput['religious_requirements'] : null;

        $culturalDetails->save();

        return $this->findById($id, ['creator', 'rooms', 'parents', 'emergency', 'cultural_details', 'ccs_enrolment', 'health_medical', 'documents', 'allergy']);

    }

    public function updateTrackingValue(string $id)
    {
        $child = $this->findById($id, []);
        $child->immunisation_tracking = !$child->immunisation_tracking;
        $child->save();
        return;
    }

    public function findByBranch($id, array $args, array $depends)
    {
        $child = $this->child->where('branch_id', $id);

        // attach relationship data
        if(!empty($depends))
        {
            $child->with($depends);
        }

        if (is_array($args) && !empty($args))
        {

        }

        $child = $child->get();

        if ($child->isEmpty())
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $child;
    }


}
