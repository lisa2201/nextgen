<?php

namespace Kinderm8\Http\Controllers;

use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\PaymentHistoryResourceCollection;
use Kinderm8\PaymentHistory;
use LocalizationHelper;
use RequestHelper;

class PaymentHistoryController extends Controller
{

    private $sortColumnsMap = [
        'number' => 'km8_invoices.id',
        'reference' => 'km8_payment_history.payment_ref',
        'date' => 'km8_payment_history.date',
        'amount' => 'km8_payment_history.amount',
        'status' => 'km8_payment_history.status'
    ];


    public function list(Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $payment_histories = PaymentHistory::with(['organization','invoice','payment_method'])->leftJoin('km8_invoices', 'km8_invoices.id', '=', 'km8_payment_history.invoice_id');

            if (auth()->user()->hasOwnerAccess())
            {
                $payment_histories->where('km8_payment_history.organization_id', '=', auth()->user()->organization_id);
            }

            //get actual count
            $actualCount = $payment_histories->get()->count();

            //filters
            if (!is_null($filters)) {

                $status_arr = [null, 'failed', 'paid', 'pending', 'submitted', 'rejected_gateway'];

                if (isset($filters->status) && $filters->status !== '0') {
                    $payment_histories->where('km8_payment_history.status', $status_arr[(int) $filters->status]);
                }

                if (isset($filters->date) && !empty($filters->date)) {
                    $payment_histories->where('km8_payment_history.date', $filters->date);
                }

                if (isset($filters->payment_ref) && !empty($filters->payment_ref)) {
                    $payment_histories->where('km8_payment_history.payment_ref', $filters->payment_ref);
                }
            }

            //search
            if (!is_null($searchValue)) {
                $payment_histories->whereLike([
                    'km8_invoices.number',
                    'km8_payment_history.payment_ref',
                    'km8_payment_history.transaction_ref'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $payment_histories->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $payment_histories->orderBy('km8_payment_history.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $payment_histories = $payment_histories
                // ->select(['km8_user_invitations.*'])
                ->paginate($offset);

        return (new PaymentHistoryResourceCollection($payment_histories, ['withOrg' => true,'withInvoice' => true, 'withPaymentMethod' => true]))
            ->additional([
                'totalRecords' => $actualCount,
                'filtered' => !is_null($filters)
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }


    }

}
