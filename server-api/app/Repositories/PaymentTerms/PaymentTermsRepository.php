<?php

namespace Kinderm8\Repositories\PaymentTerms;

use Carbon\Carbon;
use DBHelper;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\ParentPaymentTerm;
use Kinderm8\Traits\UserAccessibility;

class PaymentTermsRepository implements IPaymentTermsRepository
{
    use UserAccessibility;

    private $paymentTerms;

    private $sortColumnsMap = [
        'name' => 'first_name'
    ];

    public function __construct(ParentPaymentTerm $paymentTerms)
    {
        $this->paymentTerms = $paymentTerms;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->paymentTerms, $method], $args);
    }

    public function findById(int $id)
    {

        $paymentTerm = $this->paymentTerms->withTrashed()->find($id);

        if (is_null($paymentTerm)) {
            throw new ResourceNotFoundException('resource not found exception', ErrorType::NotFound);
        }

        return $paymentTerm;

    }

    public function list(Request $request, array $args)
    {

        $actualCount = 0;
        $filters = null;

        //pagination
        $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

        //search
        $searchValue = (!Helpers::IsNullOrEmpty($request->get('search'))) ? Helpers::sanitizeInputString($request->get('search'), true) : null;

        //sort
        $sortOption = (!Helpers::IsNullOrEmpty($request->get('sort')) && is_null($searchValue)) ? json_decode($request->get('sort')) : null;

        //filters
        $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

        //query builder
        $paymentTerms = $this->paymentTerms->query();

        $paymentTerms = $this->attachAccessibilityQuery($paymentTerms);

        //get actual count
        $actualCount = $paymentTerms->get()->count();

        //filters
        if (!is_null($filters)) {

            // if (isset($filters->primary_payer) && $filters->primary_payer == true) {

            //     $accounts->whereHas('child', function($query) {
            //         $query->where('primary_payer', '=', true);
            //     });

            // }

            // if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

            //     $accounts->where('status', '=', $filters->parent_status);

            // }

        }

        //search
        if (!is_null($searchValue)) {

            // $paymentTerms->where(function ($query) use ($searchValue) {
            //     $query->where('first_name', 'ILIKE', '%' . $searchValue . '%')
            //         ->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%')
            //         ->orWhereHas('child', function ($chquery) use ($searchValue) {
            //             $chquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%');
            //         });
            // });
        }

        //sorting
        if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
            $paymentTerms->orderBy(
                Arr::get($this->sortColumnsMap, $sortOption->key),
                Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
            );
        } else {
            $paymentTerms->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
        }

        $paymentTerms = $paymentTerms
            ->paginate($offset);

        return [
            'list' => $paymentTerms,
            'totalRecords' => $actualCount,
            'filtered' => $actualCount,
            'totalRecords' => !is_null($filters)
        ];

    }

    public function store(Request $request)
    {

        $start_date = $request->input('start_date');
        $end_date = $request->input('end_date');
        $format = 'Y-m-d';
        $creator = auth()->user();

        if (Carbon::createFromFormat($format, $end_date)->isBefore(Carbon::createFromFormat($format, $start_date))) {
            throw new Exception('Invalid date range', 1000);
        }

        $overlap = $this->paymentTerms->query();

        $overlap = $this->attachAccessibilityQuery($overlap);

        $overlap = $overlap
            ->where('start_date', '<=', $end_date)
            ->where('end_date', '>=', $start_date)
            ->where('status', '=', '0')
            ->get();

        if (count($overlap) > 0) {
            throw new Exception('Date range overlap found', 1000);
        }

        $paymentTerm = new $this->paymentTerms;
        $paymentTerm->organization_id = $creator->organization_id;
        $paymentTerm->branch_id = $creator->branch_id;
        $paymentTerm->created_by = $creator->id;
        $paymentTerm->name = $request->input('name');
        $paymentTerm->start_date = $start_date;
        $paymentTerm->end_date = $end_date;
        $paymentTerm->transaction_generation_date = $request->input('transaction_generation_date');
        $paymentTerm->payment_generation_date = $request->input('payment_generation_date') ? $request->input('payment_generation_date') : null;
        $paymentTerm->status = '0';

        $paymentTerm->save();

        return $paymentTerm;

    }

    public function update(Request $request)
    {

        $start_date = $request->input('start_date');
        $end_date = $request->input('end_date');
        $format = 'Y-m-d';
        $creator = auth()->user();
        $paymentTerm = $this->findById(Helpers::decodeHashedID($request->input('id')));

        if (Carbon::createFromFormat($format, $end_date)->isBefore(Carbon::createFromFormat($format, $start_date))) {
            throw new Exception('Invalid date range', 1000);
        }

        $overlap = $this->paymentTerms->query();

        $overlap = $this->attachAccessibilityQuery($overlap);

        $overlap = $overlap
            ->where('start_date', '<=', $end_date)
            ->where('end_date', '>=', $start_date)
            ->where('status', '=', '0')
            ->where('id', '!=', $paymentTerm->id)
            ->get();

        if (count($overlap) > 0) {
            throw new Exception('Date range overlap found', 1000);
        }

        $paymentTerm->name = $request->input('name');
        $paymentTerm->start_date = $start_date;
        $paymentTerm->end_date = $end_date;
        $paymentTerm->transaction_generation_date = $request->input('transaction_generation_date');
        $paymentTerm->payment_generation_date = $request->input('payment_generation_date') ? $request->input('payment_generation_date') : null;

        $paymentTerm->save();

        return $paymentTerm;

    }

    public function updateStatus(Request $request)
    {

        $paymentTerm = $this->findById(Helpers::decodeHashedID($request->input('id')));

        if ($request->has('status'))
        {

            $status = $request->input('status');

            if ($status === '0') {

                $overlap = $this->paymentTerms->query();

                $overlap = $this->attachAccessibilityQuery($overlap);

                $overlap = $overlap
                    ->where('start_date', '<=', $paymentTerm->end_date)
                    ->where('end_date', '>=', $paymentTerm->start_date)
                    ->where('status', '=', '0')
                    ->where('id', '!=', $paymentTerm->id)
                    ->get();
                
                if (count($overlap) > 0) {
                    throw new Exception('Date range overlap found', 1000);
                }

            }

            $paymentTerm->status = $request->input('status');
        
        }

        $paymentTerm->save();

        return $paymentTerm;

    }

    public function delete(int $id)
    {

        $paymentTerm = $this->findById($id);

        $paymentTerm->delete();

    }

}
