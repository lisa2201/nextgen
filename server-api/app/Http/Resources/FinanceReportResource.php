<?php

namespace Kinderm8\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class FinanceReportResource extends JsonResource
{
    private $params;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @param array $params
     */
    public function __construct($resource, $params = [])
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    /**
     * Transform the resource into an array.
     *
     * @param  Request $request
     * @return array
     */
    public function toArray($request)
    {
        if (is_null($this->resource))
        {
            return [];
        }

        if (array_key_exists("agedDebtors", $this->params) && $this->params['agedDebtors'])
        {

            $next_payment_date = $this->getNextpaymentDate();

            $prop =  [
                'id' => $this->index,
                'full_name' => $this->getFullname(),
                'balance' => $this->getBalance(),
                'next_payment_date' => $next_payment_date,
                'children' => $this->getChildName(),
                'last_payment_date' => $this->getLastPaymentDate(),
                'days_overdue' => $next_payment_date ?  Carbon::now()->diffInDays(Carbon::createFromFormat('Y-m-d', $next_payment_date)) : 0
            ];

        }

        return $prop;

    }

    public function getChildName()
    {
        $child_names = $this->child->map(function($value) {
            return $value->first_name . ' ' . $value->last_name;
        });

        return join(',', $child_names->toArray());
    }

    public function getFullname()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function getBalance()
    {

        $balance = 0;

        if (count($this->transactions) > 0)
        {
            $transactions = $this->transactions;
            $balance = $transactions[0]['running_total'];
        }

        return $balance;

    }

    public function getNextpaymentDate()
    {
        $next_payment_date = null;

        if (count($this->paymentSchedules))
        {
            $filteredSchedule = $this->paymentSchedules->filter(function ($value) {
                return (($value->status === 'active' || $value->status === 'upcoming') && $value->deleted_at === null);
            });

            if (count($filteredSchedule) > 0) {
                $next_payment_date = $filteredSchedule->first()->next_generation_date;
            }
        }

        return $next_payment_date;
    }

    public function getLastPaymentDate()
    {

        $last_date = null;

        if (count($this->transactions) > 0) {

            $filtered = $this->transactions->filter(function($value) {
                return $value->transaction_type === 'parent_payment' && $value->mode === 'credit';
            });

            if (count($filtered) > 0) {
                $last_date = $filtered->first()->created_at->format('Y-m-d');
            }

        }

        return $last_date;

    }

}
