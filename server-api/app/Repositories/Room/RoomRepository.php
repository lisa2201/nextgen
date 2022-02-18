<?php

namespace Kinderm8\Repositories\Room;

use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Illuminate\Http\Request;
use Kinderm8\Room;
use Kinderm8\Traits\UserAccessibility;

class RoomRepository implements IRoomRepository
{
    use UserAccessibility;

    private $room;

    public function __construct(Room $room)
    {
        $this->room = $room;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->room, $method], $args);
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
        $rooms = $this->room->query();

        $rooms = $this->attachAccessibilityQuery($rooms);

        if($withTrashed)
        {
            $rooms->withTrashed();
        }

        if(!empty($depends))
        {
            $rooms->with($depends);
        }

        if(is_array($args) && !empty($args))
        {
            $rooms
                ->when(isset($args['ids']), function ($query) use ($args)
                {
                    return $query->whereIn('id', $args['ids']);
                })
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                })
                ->when(isset($args['org']), function ($query) use ($args)
                {
                    return $query->where('organization_id', $args['org']);
                })
                ->when(isset($args['branch']), function ($query) use ($args)
                {
                    return $query->where('branch_id', $args['branch']);
                })
                ->when(isset($args['admin_only']), function ($query) use ($args)
                {
                    return $query->where('admin_only', $args['admin_only']);
                })
                ->when(isset($args['order']) && is_array($args['order']) && !empty($args['order']), function ($query) use ($args)
                {
                    return $query->orderBy($args['order']['column'], $args['order']['value']);
                });
        }
        // default
        else
        {
            $rooms->orderBy('id', 'asc');
        }

        return $rooms->get();
    }

    /**
     * @param Request $request
     * @return array
     */
    public function list(Request $request)
    {
        $roomList = [];
        $actualCount = 0;
        $displayCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $roomList = $this->room->query();

            //portal admin
            $roomList = $this->attachAccessibilityQuery($roomList);

            $actualCount = $roomList->get()->count();

            //filters
            if(!is_null($filters))
            {
                if(isset($filters) && $filters !== '0')
                {
                    $roomList->where('status', (($filters === '1') ? "0" : "1"));
                }
            }

            //search
            if(!is_null($searchValue))
            {
                $roomList->whereLike([
                    'km8_rooms.title',
                    'km8_rooms.description'
                ], $searchValue);
            }

            $displayCount = $roomList->get()->count();

            $roomList = $roomList
                ->orderBy('id', 'desc')
                ->paginate($offset);

            // load relationships after pagination
            $roomList->load(['staff', 'child', 'roomCapacity']);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return [
            'list' => $roomList,
            'totalRecords' => $actualCount,
            'displayRecord' =>$displayCount,
            'filtered' => !is_null($filters) && (isset($filters) && $filters !== '0')
        ];
    }

    /**
     * @param Request $request
     * @param string $capacity_model
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function store(request $request, string $capacity_model)
    {
        if(auth()->user()->isRoot())
        {
            $organization_id = null;
            $branch_id = null;
        }
        else
        {
            $organization_id = auth()->user()->organization_id;
            $branch_id = (auth()->user()->hasOwnerAccess()) ? null : auth()->user()->branch_id;
        }

        if(!is_null($organization_id))
        {
            $exists = $this->room::where('organization_id', $organization_id)
                    ->where('branch_id',$branch_id)
                    ->where('title', '=', $request->input('title'))
                    ->count() > 0;

            if($exists)
            {
                throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
            }
        }

        // create organization record
        $newObj = new $this->room();
        //required fields
        $newObj->title = $request->input('title');
        $newObj->description = $request->input('desc');
        $newObj->organization_id = $organization_id;
        $newObj->branch_id = $branch_id;
        $newObj->created_by = auth()->user()->id;
        $newObj->start_time = $request->input('startTime');
        $newObj->end_time = $request->input('endTime');
        $newObj->staff_ratio = $request->input('childrenPerEducator');
        $newObj->status = ($request->input('status') == false) ? '1' : '0';
        $newObj->admin_only = ($request->input('admin_only') == false) ? false : true;

        $newObj->save();

        $room = $this->findById($newObj->id, []);
        $room->staff()->attach(Helpers::decodeHashedID($request->input('staff')));

        return $newObj;
    }

    /**
     * @param Request $request
     * @param string $id
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function updateStatus(Request $request, string $id)
    {
        $option = (filter_var($request->input('status'), FILTER_VALIDATE_BOOLEAN)) ? '0' : '1';
        $room = $this->findById($id, []);

        $room->status = $option;
        $room->save();

        return $room;
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id, array $depends)
    {
        $room = $this->room->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $room->with($depends);
        }

        $room = $room->first();

        if (is_null($room))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $room;
    }

    /**
     * @param Request $request
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function update(Request $request)
    {
        if(auth()->user()->isRoot())
        {
            $organization_id = null;
            $branch_id = null;
        }
        else
        {
           $organization_id = auth()->user()->organization_id;
           $branch_id = (auth()->user()->hasOwnerAccess()) ? null : auth()->user()->branch_id;
        }

        $id = Helpers::decodeHashedID($request->input('id'));

        $roomObj = $this->findById($id, []);

        $roomObj->title = $request->input('title');
        $roomObj->description = $request->input('desc');
        $roomObj->branch_id = $branch_id;
        $roomObj->organization_id = $organization_id;
        $roomObj->start_time = $request->input('startTime');
        $roomObj->end_time = $request->input('endTime');
        $roomObj->staff_ratio = $request->input('childrenPerEducator');
        $roomObj->status = ($request->input('status') == false) ? '1' : '0';
        $roomObj->admin_only = ($request->input('admin_only') == false) ? false : true;

        $roomObj->save();

        $room = $this->findById($roomObj->id, []);
        $room->staff()->detach();
        $room->staff()->attach(Helpers::decodeHashedID($request->input('staff')));

        return $roomObj;
    }

    /**
     * @param string $id
     * @return int
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $room = $this->room::withCount('child')->find($id);

        if($room->child_count)
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        $room->staff()->detach();
        $room->delete();

         //query builder
        $roomList = $this->room->with(['staff', 'child', 'roomCapacity', 'roomCapacity.user']);

         //portal admin
        $roomList = $this->attachAccessibilityQuery($roomList);

        $actualCount = $roomList->get()->count();

        return $actualCount;
    }

    /**
     * @param Request $request
     * @param Model|null $childObj
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function findRoomsForChild(Request $request, ?Model $childObj, bool $withTrashed)
    {
        $room_list = $this->room->where('km8_rooms.status', '=', '0');

        $room_list = $this->room->where('km8_rooms.admin_only', false);

        if(!$withTrashed)
        {
            $room_list->whereNull('km8_rooms.deleted_at');
        }

        //ignore selected users
        if(!is_null($childObj) && !is_null($childObj->rooms) && count($childObj->rooms) > 0)
        {
            $room_list->whereNotIn('km8_rooms.id', $childObj->rooms->pluck('id'));
        }

        $room_list = $this->attachAccessibilityQuery($room_list, null, 'km8_rooms');

        return $room_list
            ->select(['km8_rooms.*'])
            ->groupBy('km8_rooms.id')
            ->get();
    }

    public function findRoomsForUser(Request $request, ?Model $userdObj, bool $withTrashed)
    {
        $room_list = $this->room->where('km8_rooms.status', '=', '0');

        if(!$withTrashed)
        {
            $room_list->whereNull('km8_rooms.deleted_at');
        }

        //ignore selected users
        if(!is_null($userdObj) && !is_null($userdObj->rooms) && count($userdObj->rooms) > 0)
        {
            $room_list->whereNotIn('km8_rooms.id', $userdObj->rooms->pluck('id'));
        }

        $room_list = $this->attachAccessibilityQuery($room_list, null, 'km8_rooms');

        return $room_list
            ->select(['km8_rooms.*'])
            ->groupBy('km8_rooms.id')
            ->orderBy('km8_rooms.title', 'asc')
            ->get();
    }

    public function findRoomsForBranch(Request $request, int $branch_id, bool $withTrashed)
    {
        $room_list = $this->room->where('km8_rooms.status', '=', '0');

        if (!$withTrashed) {
            $room_list->whereNull('km8_rooms.deleted_at');
        }

        if (!auth()->user()->isAdministrative()) {
            $room_list->where('km8_rooms.admin_only', false);
        }

        //ignore selected users
        if (!is_null($branch_id)) {
            $room_list->where('km8_rooms.branch_id', $branch_id);
        }

        $room_list = $this->attachAccessibilityQuery($room_list, null, 'km8_rooms');

        return $room_list
            ->select(['km8_rooms.*'])
            ->groupBy('km8_rooms.id')
            ->orderBy('km8_rooms.title', 'asc')
            ->get();
    }
}
