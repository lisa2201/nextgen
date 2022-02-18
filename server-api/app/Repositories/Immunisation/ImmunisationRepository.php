<?php

namespace Kinderm8\Repositories\Immunisation;

use Carbon\Carbon;
use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use CCSHelpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Traits\UserAccessibility;
use Log;
use PaymentHelpers;
use Kinderm8\Immunisation;
use LocalizationHelper;

class ImmunisationRepository implements IImmunisationRepository
{
    use UserAccessibility;

    private $immunisation;

    public function __construct(Immunisation $immunisation)
    {
        $this->immunisation = $immunisation;
    }

    public function get(array $args, array $depends, Request $request, bool $withTrashed)
    {
        //query builder
        $immunisation_list = $this->immunisation
            ->with(['creator','branch','schedule'
            => function ($query) {
                $query->withTrashed();
            }]);


        //access
        $immunisation_list = $this->attachAccessibilityQuery($immunisation_list);

        if ($withTrashed)
        {
            $immunisation_list->withTrashed();
        }

        if (is_array($args) && !empty($args))
        {
            $immunisation_list
                ->when(isset($args['status']), function ($query) use ($args)
                {
                    return $query->where('status', $args['status']);
                });
        }
        // default
        else
        {
            $immunisation_list->orderBy('id', 'asc');
        }

        //get actual count
        return $immunisation_list
            ->whereHas('schedule', function($query){
                $query->orderBy('id', 'asc');
            })->get();
    }

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
            $immunisation_list = $this->immunisation
                ->with(['creator','branch','schedule']);

            //access
            $immunisation_list = $this->attachAccessibilityQuery($immunisation_list);

            //get actual count
            $actualCount = $immunisation_list
                ->get()
                ->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters->status) && $filters->status !== '2')
                {
                    $immunisation_list->where('status', '=', $filters->status);
                }

                if (isset($filters->branch) && !is_null($filters->branch))
                {
                    if (strtolower($filters->branch) === 'none')
                    {
                        if(auth()->user()->organization_id){
                            $immunisation_list->where('organization_id', auth()->user()->organization_id);
                        }
                        else{
                            $immunisation_list = $immunisation_list->whereNotNull('organization_id');
                        }

                    }
                    else {
                        $immunisation_list->where('branch_id', Helpers::decodeHashedID($filters->branch));
                    }
                }
            }

            //search
            if (!is_null($searchValue))
            {
                $searchList = [
                    'km8_immunisation.name'
                ];

                if (!empty($searchList))
                {
                    $immunisation_list->whereLike($searchList, $searchValue);
                }
            }

            $immunisation_list = $immunisation_list
            ->with(['creator','branch','schedule'
            => function ($query) {
                $query->orderBy('id', 'asc');
            }])->paginate($offset);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $immunisation_list = [];
        }

        return [
            'list' => $immunisation_list,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }

    public function store(Request $request , string $schedule_model, string $branchModel )
    {
        if(!is_null($request->input('branches')) && $request->input('branches') !== null) {

            foreach($request->input('branches') as $branch) {

                $immunisationAcc = new $this->immunisation;
                $immunisationAcc->organization_id = auth()->user()->organization_id ? auth()->user()->organization_id : app()->make("Kinderm8\\{$branchModel}")->find(Helpers::decodeHashedID($branch))->organization->id;
                $immunisationAcc->branch_id = Helpers::decodeHashedID($branch);
                $immunisationAcc->created_by = auth()->user()->id;

                $immunisationAcc->name = $request->input('name');
                $immunisationAcc->description = $request->input('desc');
                $immunisationAcc->status = $request->input('status');

                $immunisationAcc->save();

                //store schedule
                foreach($request->input('schedule') as $period){

                    $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}");
                    $scheduleAcc->immunisation_id = $immunisationAcc->id;
                    $scheduleAcc->number = $period['number'];
                    $scheduleAcc->period = $period['period'];
                    $scheduleAcc->save();
                }

            }

        }
        else{

                $immunisationAcc = new $this->immunisation;
                $immunisationAcc->organization_id = auth()->user()->organization_id;
                $immunisationAcc->branch_id = auth()->user()->branch_id;
                $immunisationAcc->created_by = auth()->user()->id;

                $immunisationAcc->name = $request->input('name');
                $immunisationAcc->description = $request->input('desc');
                $immunisationAcc->status = $request->input('status');

                $immunisationAcc->save();

                //store schedule
                foreach($request->input('schedule') as $period){

                    $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}");
                    $scheduleAcc->immunisation_id = $immunisationAcc->id;
                    $scheduleAcc->number = $period['number'];
                    $scheduleAcc->period = $period['period'];
                    $scheduleAcc->save();
                }
        }


        return;
    }

    public function findById($id)
    {
        $immunisation = $this->immunisation
            ->where('id', $id)
            ->with(['creator','branch','schedule'
            => function ($query) {
                $query->orderBy('id', 'asc');
            }])
            ->first();

        if (is_null($immunisation))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $immunisation;
    }

    public function updateStatus(string $id, Request $request)
    {
        $option = (filter_var($request->input('status'), FILTER_VALIDATE_BOOLEAN)) ? '1' : '0';

        $immunisation = $this->findById($id);

        if(!is_null($immunisation) && $immunisation->status != $option)
        {
            $immunisation->status = $option;

            $immunisation->save();

        }

        return $immunisation;
    }

    public function update(string $id, Request $request, string $schedule_model)
    {
        $option = (filter_var($request->input('status'), FILTER_VALIDATE_BOOLEAN)) ? '1' : '0';

        $immunisationAcc = $this->findById($id);

        $immunisationAcc->name = $request->input('name');
        $immunisationAcc->description = $request->input('desc');
        $immunisationAcc->status = $request->input('status');
        $immunisationAcc->save();

        $scheduleList = app()->make("Kinderm8\\{$schedule_model}")->where('immunisation_id', $id)->pluck('id')->toArray();
        //store schedule
        foreach($request->input('schedule') as $period){

            if(!is_null($period['id']) && $period['id'] !== '')
            {
                $schedule_id = Helpers::decodeHashedID($period['id']);
                $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}")->find($schedule_id);

                if (($key = array_search($schedule_id, $scheduleList)) !== false) {
                    unset($scheduleList[$key]);
                }

            }
            else
            {
                $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}");
            }

            $scheduleAcc->immunisation_id = $immunisationAcc->id;
            $scheduleAcc->number = $period['number'];
            $scheduleAcc->period = $period['period'];
            $scheduleAcc->save();
        }

        //deleting schedule
        $scheduleAc = app()->make("Kinderm8\\{$schedule_model}")->whereIn('id', $scheduleList)->delete();


        return $this->findById($immunisationAcc->id);
    }

    public function delete(string $id)
    {
        $child = $this->findById($id);

        if ($child->deleted_at != null) {
            $child->forceDelete();
        } else {
            $child->delete();
        }

        return true;
    }


    public function getTracker(array $args, Request $request, string $tracker_model)
    {

        try
        {
            //query builder
            $immunisation_list = app()->make("Kinderm8\\{$tracker_model}")
                            ->where('child_id', Helpers::decodeHashedID($request->input('id')))
                            ->with(['creator','branch','schedule', 'immunisation', 'child']);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $immunisation_list = [];
        }

        return $immunisation_list->get();
    }


    public function getAllTracker(array $args, Request $request, string $tracker_model)
    {

        try
        {
            //query builder
            $immunisation_list = app()->make("Kinderm8\\{$tracker_model}")
                            ->with(['creator','branch','schedule', 'immunisation', 'child']);

                            //access
        $immunisation_list = $this->attachAccessibilityQuery($immunisation_list);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $immunisation_list = [];
        }

        return $immunisation_list->get();
    }

    public function storeSingleTracker(Request $request, string $tracker_model)
    {

        // create
        $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}");
        $immunisationAcc->branch_id = auth()->user()->branch_id;
        $immunisationAcc->organization_id = auth()->user()->organization_id;
        $immunisationAcc->date = $request->input('date') ? $request->input('date') : null;
        $immunisationAcc->created_by = auth()->user()->id;
        $immunisationAcc->child_id = Helpers::decodeHashedID($request->input('child'));
        $immunisationAcc->immunisation_id = Helpers::decodeHashedID($request->input('immunisation'));
        $immunisationAcc->immunisation_schedule_id = Helpers::decodeHashedID($request->input('schedule'));
        $immunisationAcc->save();

        return $immunisationAcc;
    }


    public function updateSingleTracker(Request $request, string $tracker_model)
    {

        $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}")->find(Helpers::decodeHashedID($request->input('tracker')));
        $immunisationAcc->date = $request->input('date') ? $request->input('date') : null;
        $immunisationAcc->created_by = auth()->user()->id;
        $immunisationAcc->save();

        return $immunisationAcc;
    }

    public function updatebulkTrackerByChild(Request $request, string $tracker_model)
    {

        foreach ($request->input('data')  as $key => $immunisation) {

            $child_id = $immunisation['child']['id'];
            $schedule_id = $immunisation['schedule'][0]['id'];
            $immunisation_id = $immunisation['id'];
            $tracker_id = (array_key_exists('tracker', $immunisation['schedule'][0]) && $immunisation['schedule'][0]['tracker'])? $immunisation['schedule'][0]['tracker']['id'] : null;

            if(!Helpers::IsNullOrEmpty($tracker_id)) {

                continue;
            }
                $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}");
                $immunisationAcc->branch_id = auth()->user()->branch_id;
                $immunisationAcc->organization_id = auth()->user()->organization_id;
                $immunisationAcc->date = null;
                $immunisationAcc->created_by = auth()->user()->id;
                $immunisationAcc->child_id = Helpers::decodeHashedID($child_id);
                $immunisationAcc->immunisation_id = Helpers::decodeHashedID($immunisation_id);
                $immunisationAcc->immunisation_schedule_id = Helpers::decodeHashedID($schedule_id);
                $immunisationAcc->save();

        }

        return;

    }


    public function deleteBulkTrackerByChild(Request $request, string $tracker_model)
    {

        foreach ($request->input('index')  as $key => $tracker) {

            $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}")->find(Helpers::decodeHashedID($tracker));

            if ($immunisationAcc->deleted_at != null)
            {
                $immunisationAcc->forceDelete();
            }
            else
            {
                $immunisationAcc->delete();
            }

        }

        return;

    }

    public function deleteTrackerByID(Request $request, string $tracker_model)
    {

        $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}")->find(Helpers::decodeHashedID($request->input('id')));

        // copy for reference
        $clone = $immunisationAcc;

         if ($immunisationAcc->deleted_at != null)
        {
            $immunisationAcc->forceDelete();
        }
        else
        {
            $immunisationAcc->delete();
        }


        return $clone;

    }


    public function updatebulkTracker(Request $request, string $tracker_model)
    {

        foreach ($request->input('data')  as $key => $child) {

            $child_id = $child['child']['id'];

            foreach ($child['immunisationData'] as $key => $immunisation) {

                $schedule_id = $immunisation['schedule'][0]['id'];
                $immunisation_id = $immunisation['id'];
                $tracker_id = (array_key_exists('tracker', $immunisation['schedule'][0]) && $immunisation['schedule'][0]['tracker'])? $immunisation['schedule'][0]['tracker']['id'] : null;

                if(!Helpers::IsNullOrEmpty($tracker_id)) {

                    continue;
                }
                $immunisationAcc = app()->make("Kinderm8\\{$tracker_model}");
                $immunisationAcc->branch_id = auth()->user()->branch_id;
                $immunisationAcc->organization_id = auth()->user()->organization_id;
                $immunisationAcc->date = null;
                $immunisationAcc->created_by = auth()->user()->id;
                $immunisationAcc->child_id = Helpers::decodeHashedID($child_id);
                $immunisationAcc->immunisation_id = Helpers::decodeHashedID($immunisation_id);
                $immunisationAcc->immunisation_schedule_id = Helpers::decodeHashedID($schedule_id);
                $immunisationAcc->save();
            }
        }

        return;

    }

    public function import(Request $request, string $schedule_model, string $orgModel )
    {

        if(!is_null($request->input('org')) && $request->input('org') !== null) {

            foreach($request->input('org') as $org) {

                $organization = app()->make("Kinderm8\\{$orgModel}")->where('id', Helpers::decodeHashedID($org))->with(['branch'])->first();

                if(!is_null($organization) && !is_null($organization->branch) && count($organization->branch) > 0){


                    foreach($organization->branch as $branch){

                        // check if already imported data for this or
                        if($this->immunisation->where('branch_id', $branch->id)->get()->count() > 0) {

                            throw new Exception(LocalizationHelper::getTranslatedText('immunisation.already_imported'), ErrorType::CustomValidationErrorCode);
                        }
                        foreach($this->getDefaultData() as $data){

                            $immunisationAcc = new $this->immunisation;
                            $immunisationAcc->organization_id = $organization->id;
                            $immunisationAcc->branch_id = $branch->id;
                            $immunisationAcc->created_by = auth()->user()->id;

                            $immunisationAcc->name = $data['name'];
                            $immunisationAcc->description = $data['desc'];
                            $immunisationAcc->status = $data['status'];

                            $immunisationAcc->save();

                            //store schedule
                            foreach($data['schedule'] as $period){

                                $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}");
                                $scheduleAcc->immunisation_id = $immunisationAcc->id;
                                $scheduleAcc->number = $period['number'];
                                $scheduleAcc->period = $period['period'];
                                $scheduleAcc->save();
                            }
                        }
                    }
                }

            }
        }
        return true;
    }

    public function importForBranch(string $branchId, string $schedule_model)
    {

        if(!is_null($branchId) && $branchId !== null) {

            foreach($this->getDefaultData() as $data){

                \Log::info($branchId);
                $immunisationAcc = new $this->immunisation;
                $immunisationAcc->organization_id = auth()->user()->organization_id;
                $immunisationAcc->branch_id = $branchId;
                $immunisationAcc->created_by = auth()->user()->id;

                $immunisationAcc->name = $data['name'];
                $immunisationAcc->description = $data['desc'];
                $immunisationAcc->status = $data['status'];

                $immunisationAcc->save();

                //store schedule
                foreach($data['schedule'] as $period){

                    $scheduleAcc = app()->make("Kinderm8\\{$schedule_model}");
                    $scheduleAcc->immunisation_id = $immunisationAcc->id;
                    $scheduleAcc->number = $period['number'];
                    $scheduleAcc->period = $period['period'];
                    $scheduleAcc->save();
                }
            }
        }
        return true;
    }

    public function getDefaultData(){

        return $data = array (
            array (
                'name' => '13PVC',
                'desc' => 'Chickenpox (varicella)',
                'schedule' =>
                array (
                  0 =>
                  array (
                    'number' => 2,
                    'period' => 'M',

                  ),
                  1 =>
                  array (
                    'number' => 4,
                    'period' => 'M',

                  ),
                  2 =>
                  array (
                    'number' => 6,
                    'period' => 'M',

                  ),
                  3 =>
                  array (
                    'number' => 12,
                    'period' => 'M',

                  ),
                ),
                'status' => '1',

                ),
            array (
            'name' => '23vPPV',
            'desc' => 'Pneumococcal disease',
            'schedule' =>
            array (
              0 =>
              array (
                'number' => 4,
                'period' => 'M',

              ),
              1 =>
              array (
                'number' => 4,
                'period' => 'Y',

              ),
            ),
            'status' => '1',
        ),
        array (
            'name' => 'DTPa',
            'desc' => 'Diphtheria',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 2,
                  'period' => 'M',

                ),
                1 =>
                array (
                  'number' => 4,
                  'period' => 'M',

                ),
                2 =>
                array (
                  'number' => 6,
                  'period' => 'M',

                ),
                3 =>
                array (
                  'number' => 4,
                  'period' => 'Y',

                ),
            ),
            'status' => '1',
        ),
        array (
            'name' => 'HepA',
            'desc' => 'Hepatitis A',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 12,
                  'period' => 'M',
                )
            ),
            'status' => '1',

        ),
        array (
            'name' => 'HepB',
            'desc' => 'Hepatitis B',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 0,
                  'period' => 'M',

                ),
                1 =>
                array (
                  'number' => 2,
                  'period' => 'M',

                ),
                2 =>
                array (
                  'number' => 4,
                  'period' => 'M',

                ),
                3 =>
                array (
                    'number' => 6,
                    'period' => 'M',

                )
            ),
            'status' => '1',

        ),
        array (
            'name' => 'Hib',
            'desc' => 'Haemophilus influenza type b',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 2,
                  'period' => 'M',

                ),
                1 =>
                array (
                  'number' => 4,
                  'period' => 'M',

                ),
                2 =>
                array (
                  'number' => 6,
                  'period' => 'M',

                ),
                3 =>
                array (
                    'number' => 12,
                    'period' => 'M',

                )
            ),
            'status' => '1',

        ),
        array (
            'name' => 'Influenza',
            'desc' => '',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 6,
                  'period' => 'M',
                ),
            ),
            'status' => '1',

        ),
        array (
            'name' => 'MMR',
            'desc' => 'Measles',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 12,
                  'period' => 'M',
                ),
                1 =>
                array (
                  'number' => 18,
                  'period' => 'M',
                ),
                2 =>
                array (
                  'number' => 4,
                  'period' => 'Y',
                ),
            ),
            'status' => '1',

        ),
        array (
            'name' => 'MenCCV',
            'desc' => 'Meningococcal AWCY',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 12,
                  'period' => 'M',
                ),
            ),
            'status' => '1',

        ),
        array (
            'name' => 'OPV/IPV',
            'desc' => 'Polio (poliomyelitis)',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 2,
                  'period' => 'M',
                ),
                1 =>
                array (
                  'number' => 4,
                  'period' => 'M',
                ),
                2 =>
                array (
                  'number' => 6,
                  'period' => 'M',
                ),
                3 =>
                array (
                  'number' => 4,
                  'period' => 'Y',
                ),
            ),
            'status' => '1',

        ),
        array (
            'name' => 'Rotavirus',
            'desc' => '',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 2,
                  'period' => 'M',
                ),
                1 =>
                array (
                  'number' => 4,
                  'period' => 'M',
                ),
                2 =>
                array (
                  'number' => 6,
                  'period' => 'M',
                ),
            ),
            'status' => '1',

        ),
        array (
            'name' => 'VZY',
            'desc' => 'Varicella-Zoster Virus',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 18,
                  'period' => 'M',
                )
            ),
            'status' => '1',

        ),
        array (
            'name' => '7vPCV',
            'desc' => 'Pneumococcal disease',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 2,
                  'period' => 'M',
                ),
                1 =>
                array (
                  'number' => 4,
                  'period' => 'M',
                ),
                2 =>
                array (
                  'number' => 6,
                  'period' => 'M',
                )
            ),
            'status' => '1',

        ),
        array (
            'name' => '23vPCV',
            'desc' => 'Pneumococcal disease',
            'schedule' =>
            array (
                0 =>
                array (
                  'number' => 18,
                  'period' => 'M',
                )
            ),
            'status' => '1',

          )
        );
    }

    public function getAllSchedule(){

        $immunisataionUniqe = $this->immunisation->with(['creator','branch','schedule'])
            ->join('km8_immunisation_schedule', 'km8_immunisation_schedule.immunisation_id', '=', 'km8_immunisation.id');

            $immunisataionUniqe = $this->attachAccessibilityQuery($immunisataionUniqe, Null, 'km8_immunisation');

            return $immunisataionUniqe
            ->select(DB::raw("DISTINCT ON (km8_immunisation_schedule.number,km8_immunisation_schedule.period) km8_immunisation_schedule.*"))
            ->groupBy('km8_immunisation_schedule.id')
            ->get();
    }
}
