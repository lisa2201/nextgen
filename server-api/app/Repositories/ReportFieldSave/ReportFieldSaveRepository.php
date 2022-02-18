<?php

namespace Kinderm8\Repositories\ReportFieldSave;

use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\ReportField;
use Log;

class ReportFieldSaveRepository implements IReportFieldSaveRepository
{
    use UserAccessibility;
    private $fieldSave;
    public function __construct(ReportField $fieldSave)
    {
        $this->fieldSave = $fieldSave;
    }
    /**
     * @param Request $request
     * @return Builder[]|Collection
     */

    public function saveField(Request $request)
    {

        try
        {

            // check field exist
            $found = $this->fieldSave::where('report_type', '=', $request->input('type'))
                    ->where('organization_id' , '=', auth()->user()->organization_id)
                    ->where('branch_id' , '=', auth()->user()->branch_id)
                    ->get();

            if($found->count() === 1){

                $field_object =  $this->fieldSave::find(Helpers::decodeHashedID($found[0]->index));
                $field_object->organization_id = auth()->user()->organization_id;
                $field_object->branch_id = auth()->user()->branch_id;
                $field_object->field = $request->input('field');
                $field_object->report_type = $request->input('type');
                $field_object->master_type = $request->input('masterType');
                $field_object->name = $request->input('name');
                $field_object->save();
                $isNew = false;
            }
            else{

            $field_object = new $this->fieldSave;
            $field_object->organization_id = auth()->user()->organization_id;
            $field_object->branch_id = auth()->user()->branch_id;
            $field_object->field = $request->input('field');
            $field_object->report_type = $request->input('type');
            $field_object->master_type = $request->input('masterType');
            $field_object->name = $request->input('name');
            $field_object->save();
            $isNew = true;
            }


        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }
        return [
            'list'=> $field_object,
            'type'=>$isNew
        ];

    }

    public function getField(Request $request)
    {

        $ignoreReport = [];
        try
        {
            $found = $this->fieldSave::where('master_type', '=', $request->input('type'))
                    ->Where('branch_id' , '=',null)
                    ->Where('organization_id' , '=',null)
                    ->get();

            $default = $this->fieldSave::where('master_type', '=', $request->input('type'))
                    ->Where('branch_id' , '=',null)
                    ->Where('organization_id' , '=',null);

            $btanchReport = $this->fieldSave::where('master_type', '=', $request->input('type'))
                    ->where('organization_id' , '=', auth()->user()->organization_id)
                    ->where('branch_id' , '=', auth()->user()->branch_id);

            if($btanchReport->count() > 0){

                foreach($btanchReport->get() as $breport) {

                    foreach($default->get() as $default_report) {

                        if ($default_report->report_type === $breport->report_type) {
                            array_push($ignoreReport, $breport->report_type);
                        }
                    }
                }

            }

            $default = $default->whereNotIn('report_type', $ignoreReport)
                        ->get();

            $found = $default->merge($btanchReport->get());

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }
        return [
            'list'=> $found,
        ];

    }


    public function addFavorite($id ,Request $request)
    {

        try
        {
            $report = $this->findById($id, []);

            $found = $this->fieldSave::where('report_type', '=', $report->report_type)
            ->where('organization_id' , '=', auth()->user()->organization_id)
            ->where('branch_id' , '=', auth()->user()->branch_id)
            ->get();

            if($found->count() === 1){
                $report->isFav = $report->isFav === '1' ? '0' : '1';
                $report->update();
            }
            else
            {
                $field_object = new $this->fieldSave;
                $field_object->organization_id = auth()->user()->organization_id;
                $field_object->branch_id = auth()->user()->branch_id;
                $field_object->field = $report->field;
                $field_object->report_type = $report->report_type;
                $field_object->master_type = $report->master_type;
                $field_object->name = $report->name;
                $field_object->isFav = '1';
                $field_object->save();
                $isNew = true;
            }


            // $report->isFav = $report->isFav === '1' ? '0' : '1';
            // $report->save();

            return $report;
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

    }

    public function findById($id, array $depends)
    {
        $report = $this->fieldSave->where('id', $id)->withTrashed();

        // attach relationship data
        if(!empty($depends))
        {
            $report->with($depends);
        }

        $report = $report->first();

        if (is_null($report))
        {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $report;
    }

    public function delete(string $id)
    {
        $rowObj = $this->findById($id, []);

        $rowObj->delete();

        return true;
    }

    public function updateName(string $id, string $name)
    {
        $rowObj = $this->findById($id, []);
        $rowObj->name = $name;
        $rowObj->update();

        return $rowObj;
    }

}
