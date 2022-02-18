<?php

namespace Kinderm8\Repositories\ParentPaymentSchedule;

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
use Kinderm8\ParentPaymentSchedule;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class ParentPaymentScheduleRepository implements IParentPaymentScheduleRepository
{
    use UserAccessibility;

    private $parentPaymentSchedule;

    public function __construct(ParentPaymentSchedule $parentPaymentSchedule)
    {
        $this->parentPaymentSchedule = $parentPaymentSchedule;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->parentPaymentSchedule, $method], $args);
    }

    public function findById(int $id)
    {

        $schedule = $this->parentPaymentSchedule->withTrashed()->find($id);

        if (is_null($schedule)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $schedule;

    }

    public function list(Request $request, array $args)
    {

        $dec_user_id = Helpers::decodeHashedID($request->input('user_id'));

        $payment_plans = $this->parentPaymentSchedule->query();
        $payment_plans = $this->attachAccessibilityQuery($payment_plans);
        $payment_plans = $this->parentPaymentSchedule
            ->where('user_id', $dec_user_id)
            ->orderBy('id', 'desc')
            ->get();

        $payment_plans->load(['createdBy', 'parent']);

        return $payment_plans;

    }

    public function store(Request $request)
    {

        $dec_user_id = Helpers::decodeHashedID($request->input('user_id'));
        $user = app(IUserRepository::class)->findById($dec_user_id, []);;

        if (Helpers::IsNullOrEmpty($request->input('activation_date'))) {
            $this->parentPaymentSchedule
                ->where('user_id', $dec_user_id)
                ->update(['status' => 'inactive']);
            $status = ParentPaymentSchedule::STATUS_ACTIVE;
        } else {
            $this->parentPaymentSchedule
                ->where('user_id', $dec_user_id)
                ->where('status', '!=', ParentPaymentSchedule::STATUS_ACTIVE)->update(['status' => 'inactive']);
            $status = ParentPaymentSchedule::STATUS_UPCOMING;
        }

        $schedule = new $this->parentPaymentSchedule;
        $schedule->organization_id = $user->organization_id;
        $schedule->branch_id = $user->branch_id;
        $schedule->user_id = $dec_user_id;
        $schedule->payment_frequency = $request->input('payment_frequency');
        $schedule->billing_term = $request->input('billing_term') ? $request->input('billing_term') : null;
        $schedule->payment_day = $request->input('payment_day') ? $request->input('payment_day') : null;
        $schedule->next_generation_date = $request->input('next_payment_date') ? $request->input('next_payment_date') : null;
        $schedule->activation_date = $request->input('activation_date') ? $request->input('activation_date') : null;
        $schedule->amount_limit = $request->input('amount_limit') ? $request->input('amount_limit') : null;
        $schedule->fixed_amount = $request->input('fixed_amount') ? $request->input('fixed_amount') : null;
        $schedule->status = $status;
        $schedule->created_by = auth()->user()->id;
        $schedule->auto_charge = $request->input('auto_charge') ? true : false;
        $schedule->save();

        return $schedule;

    }

    public function update(Request $request)
    {

        $plan = $this->findById(Helpers::decodeHashedID($request->input('id')));

        $history = is_null($plan->edit_history) ? [] : $plan->edit_history;

        $edit_data = [
            'payment_frequency' => $plan->payment_frequency,
            'billing_term' => $plan->billing_term,
            'payment_day' => $plan->payment_day,
            'activation_date' => $plan->activation_date,
            'amount_limit' => $plan->amount_limit,
            'fixed_amount' => $plan->fixed_amount,
            'last_generation_date' => $plan->last_generation_date,
            'next_generation_date' => $plan->next_generation_date,
            'status' => $plan->status,
            'auto_charge' => $plan->auto_charge,
            'edit_date' => Carbon::now()
        ];

        array_push($history, $edit_data);

        if ($request->has('status')) {
            $plan->status = $request->input('status');
        }

        if ($request->has('auto_charge')) {
            $plan->auto_charge = $request->input('auto_charge') ? true : false;
        }

        if ($request->has('amount_limit')) {
            $plan->amount_limit = $request->input('amount_limit') ? $request->input('amount_limit') : null;
        }

        if ($request->has('fixed_amount')) {
            $plan->fixed_amount = $request->input('fixed_amount') ? $request->input('fixed_amount') : null;
        }

        $plan->edit_history = $history;

        $plan->save();

        return $plan;

    }

    public function delete(int $id)
    {

        $plan = $this->findById($id);
        $plan->delete();

    }

}
