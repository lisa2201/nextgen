<?php

namespace Kinderm8\Repositories\AllergyTypes;

use DateTimeHelper;
use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\AllergyType;
use Kinderm8\Room;
use Kinderm8\User;
use Kinderm8\Traits\UserAccessibility;

class AllergyTypesRepository implements IAllergyTypesRepository
{
    use UserAccessibility;

    private $allergyType;
    private $user;

    public function __construct(AllergyType $allergyType)
    {
        $this->allergyType = $allergyType;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->allergyType, $method], $args);
    }

    /*public function getStaffList()
    {
        try
        {
            $staffList = null;

            if(auth()->user()->hasRole('portal-admin'))
            {
                $organization_id = null;
                $branch_id = null;
            }
            else
            {
                $organization_id = auth()->user()->organization_id;
                $branch_id = (auth()->user()->hasRole('portal-org-admin')) ? null : auth()->user()->branch_id;
            }

            if(!is_null($organization_id))
            {
                $staffList = $this->user::Staff()
                    ->where('organization_id',$organization_id)
                    ->where('branch_id',$branch_id)
                    ->get();
            }
            // Log::info($staffList);

            return [
                'list' => $staffList
            ];
        }
        catch (Exception $e)
        {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ), RequestType::CODE_500);
        }
    }*/

    /**
     * @param array $args
     * @param Request $request
     * @param bool $withTrashed
     * @return Builder[]|Collection
     */
    public function get(array $args, array $depends, Request $request, bool $withTrashed, string $organization = null)
    {
        $allergyTypes = $this->allergyType->query();

        if(auth()->user())
            $allergyTypes->where('organization_id',auth()->user()->organization_id);
        else if($organization)
            $allergyTypes->where('organization_id',$organization);
        if($withTrashed)
        {
            $allergyTypes->withTrashed();
        }

        if(!empty($depends))
        {
            $allergyTypes->with($depends);
        }

        if(is_array($args) && !empty($args))
        {
            $allergyTypes
                ->when(isset($args['created_by']), function ($query) use ($args)
                {
                    return $query->where('created_by', $args['created_by']);
                });
        }
        // default
        else
        {
            $allergyTypes->orderBy('order', 'asc');
        }

        return $allergyTypes->get();
    }

    public function importDefaultType(int $org){

        foreach($this->getType() as $data){

            $alleryAcc = new $this->allergyType;
            $alleryAcc->organization_id = $org;
            $alleryAcc->name = $data['name'];
            $alleryAcc->short_name = $data['short_name'];
            $alleryAcc->order = $data['order'];
            $alleryAcc->created_by = null;

            $alleryAcc->save();

        }

    }

    public function getType(){

        return $data = array (
            array (
                'name' => 'Allergy',
                'short_name' => 'Allergen/s',
                'order'=>1
            ),
            array (
                'name' => 'Diabetes',
                'short_name' => 'Type 1 Diabetes',
                'order'=>3
            ),
            array (
                'name' => 'Anaphylaxis',
                'short_name' => 'Allergen/s',
                'order'=>0
            ),
            array (
                'name' => 'Special dietary requirements',
                'short_name' => 'Dietary requirement',
                'order'=>4
            ),
            array (
                'name' => 'Asthma',
                'short_name' => 'Asthma',
                'order'=>2
            ),
            array (
                'name' => 'Other',
                'short_name' => 'Other',
                'order'=>6
            ),
            array (
                'name' => 'Sunscreen requirements',
                'short_name' => 'Sunscreen requirements',
                'order'=>5
            ),


        );
    }

}
