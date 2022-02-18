<?php

namespace Kinderm8\Repositories\School;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Kinderm8\Bus;
use Kinderm8\EducatorRatio;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Repositories\School\ISchoolRepository;
use Kinderm8\School;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class SchoolRepository implements ISchoolRepository
{
    use UserAccessibility;

    private $school;

    public function __construct(School $school)
    {
        $this->school = $school;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->school, $method], $args);
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function get($args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {
            //query builder
            $school_list = $this->school->whereNull('deleted_at');;

            //access
            $schoolList = $this->attachAccessibilityQuery($school_list , null, 'km8_school_list');

            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //get actual count
            $actualCount = $schoolList->get()->count();

            //search
            if(!is_null($searchValue))
            {
                $schoolList->whereLike([
                    'km8_school_list.school_name',
                    'km8_school_list.school_address'
                ], $searchValue);
            }

//            $displayCount = $schoolList->get()->count();
            if(Helpers::IsNullOrEmpty($request->input('offset')))
                $schoolList = $schoolList->orderBy('school_name','asc')->get();
            else
                $schoolList = $schoolList->orderBy('school_name','asc')->paginate($offset);;

            $displayCount = $schoolList->count();
            /*$busList = $busList
                ->orderBy('km8_educator_ratio.state', 'DESC')
                ->orderBy('km8_educator_ratio.age_order', 'ASC')
                ->select(['km8_educator_ratio.*'])->get();*/

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $schoolList = [];
        }

        return [
            'list' => $schoolList,
            'totalRecords' => $actualCount,
            'displayRecord' =>$displayCount,
            'filters' => $filters
        ];
    }

    /**
     * @param $id
     * @param array $depends
     * @return mixed
     * @throws ResourceNotFoundException
     */
    public function findById($id)
    {
        $school = $this->school->where('id', $id)->withTrashed();

        // attach relationship data
        if (!empty($depends)) {
            $school->with($depends);
        }

        $school = $school->first();

        if (is_null($school)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $school;
    }


    /**
     * @param Request $request
     * @return Bus
     */
    public function store(Request $request)
    {
        $schoolList = new $this->school;

        $schoolList->organization_id = auth()->user()->organization_id;
        $schoolList->branch_id = auth()->user()->branch_id;
        $schoolList->school_name =  $request->input('school_name');
        $schoolList->school_address =  $request->input('school_address');
        // $schoolList->bus_id =  ($request->input('bus_id'))? Helpers::decodeHashedID($request->input('bus_id')): null;


        $schoolList->save();

        //$school = $this->findById($schoolList->id);
        // \Log::info($request->input('bus_id'));
        // $schoolList->bus()->detach();
        foreach($request->input('bus_id') as $busID)
        {
            $bus = Bus::find(Helpers::decodeHashedID($busID));
            $schoolList->bus()->attach($bus);
        }
        return $schoolList;
    }

    /**
     * @param $id
     * @param Request $request
     * @return School
     * @throws ResourceNotFoundException
     */
    public function update($id, Request $request)
    {
        $school= $this->findById($id);

        $school->school_name = $request->input('school_name');
        $school->school_address= $request->input('school_address');
        // $school->bus_id = Helpers::decodeHashedID($request->input('bus_id'));


        DB::table('km8_school_bus')
            ->where('school_id', $school->id)
            ->update(array('deleted_at' => DB::raw('NOW()')));


        foreach($request->input('bus_id') as $busID)
        {
            \Log::info($busID);
            $bus = Bus::find(Helpers::decodeHashedID($busID));
            $school->bus()->attach($bus);
        }

        $school->save();

        return $school;
    }

    /**
     * @param string $id
     * @return bool
     * @throws ResourceNotFoundException
     */
    public function delete(string $id)
    {
        $schoolList = $this->findById($id);

        if ($schoolList->deleted_at != null) {
            $schoolList->forceDelete();
        } else {
            $schoolList->delete();

        }

        return true;
    }


}
