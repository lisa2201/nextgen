<?php

namespace Kinderm8\Repositories\ParentFinanceExclusion;

use Carbon\Carbon;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\ParentFinanceExclusion;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class ParentFinanceExclusionRepository implements IParentFinanceExclusionRepository
{
    use UserAccessibility;

    private $parentFinanceExclusion;
    private $userRepo;

    public function __construct(ParentFinanceExclusion $parentFinanceExclusion, IUserRepository $userRepo)
    {
        $this->parentFinanceExclusion = $parentFinanceExclusion;
        $this->userRepo = $userRepo;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->parentFinanceExclusion, $method], $args);
    }

    public function findById(int $id)
    {

        $exclusion = $this->parentFinanceExclusion->withTrashed()->find($id);

        if (is_null($exclusion)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $exclusion;

    }

    public function list(Request $request, array $args)
    {

        $dec_user_id = Helpers::decodeHashedID($request->input('user_id'));

        $exclusions = $this->parentFinanceExclusion->where('parent_id', $dec_user_id);

        $exclusions =  $this->attachAccessibilityQuery($exclusions);

        return $exclusions->orderBy('id', 'desc')->get();

    }

    public function store(Request $request)
    {

        $user = $this->userRepo->findById(Helpers::decodeHashedID($request->input('user_id')), []);

        $start_date = $request->input('start_date');
        $end_date = $request->input('end_date');

        if (Carbon::createFromFormat('Y-m-d', $end_date)->isBefore(Carbon::createFromFormat('Y-m-d', $start_date))) {
            throw new Exception('Invalid date range', 1000);
        }

        $overlap = $this->parentFinanceExclusion
            ->where('parent_id', '=', $user->id)
            ->where('start_date', '<=', $end_date)
            ->where('end_date', '>=', $start_date)
            ->get();

        if (count($overlap) > 0) {
            throw new Exception('Date range overlap found', 1000);
        }

        $exclusion = new $this->parentFinanceExclusion;
        $exclusion->organization_id = $user->organization_id;
        $exclusion->branch_id = $user->branch_id;
        $exclusion->parent_id = $user->id;
        $exclusion->start_date = $start_date;
        $exclusion->end_date = $end_date;
        $exclusion->fee = $request->input('booking_fee');
        $exclusion->ccs_payment = $request->input('ccs_payment');
        $exclusion->parent_payment = $request->input('parent_payment');

        $exclusion->save();

        return $exclusion;

    }

    public function delete(int $id)
    {

        $exclusion = $this->parentFinanceExclusion->findOrFail($id);

        $exclusion->delete();

    }

}
