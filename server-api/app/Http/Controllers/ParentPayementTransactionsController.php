<?php

namespace Kinderm8\Http\Controllers;

use DBHelper;
use ErrorHandler;
use Exception;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;
use Helpers;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Kinderm8\Http\Resources\ParentPaymentTransactionResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Traits\UserAccessibility;
use Kinderm8\User;
use LocalizationHelper;

class ParentPayementTransactionsController extends Controller
{

    use UserAccessibility;

    private $sortColumnsMap = [
        'date' => 'km8_parent_payment_transactions.date',
        'parent' => 'km8_users.first_name',
        'child' => 'km8_child_profile.first_name',
        'category' => 'km8_parent_payment_transactions.transaction_type',
        'type' => 'km8_parent_payment_transactions.mode',
        'amount' => 'km8_parent_payment_transactions.amount',
        'created' => 'km8_parent_payment_transactions.id'
    ];

    public function list(Request $request)
    {

        $actualCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            $account_transactions = ParentPaymentTransaction::with(['parent', 'child'])
                ->join('km8_users', 'km8_users.id', '=', 'km8_parent_payment_transactions.parent_id')
                ->leftJoin('km8_child_profile', 'km8_child_profile.id', '=', 'km8_parent_payment_transactions.child_id')
                ->leftJoin('km8_parent_payment_adjustments AS ppah', 'ppah.id', '=', 'km8_parent_payment_transactions.ref_id')
                ->leftJoin('km8_adjustment_items', 'km8_adjustment_items.id', '=', 'ppah.item_id')
                ->select('km8_parent_payment_transactions.*', 'km8_adjustment_items.name AS item_name');

            $account_transactions = $this->attachAccessibilityQuery($account_transactions, null, 'km8_parent_payment_transactions');

            if(auth()->user()->isParent()) {
                $account_transactions->where('km8_parent_payment_transactions.parent_id', '=', auth()->user()->id);
            }

            //get actual count
            $actualCount = $account_transactions->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->date) && !empty($filters->date)) {
                    $account_transactions->where('km8_parent_payment_transactions.date', $filters->date);
                }

                if (isset($filters->category) && !empty($filters->category) && $filters->category != '0') {
                    $account_transactions->where('km8_parent_payment_transactions.transaction_type', $filters->category);
                }

                if (isset($filters->type) && !empty($filters->type) && $filters->type != '0') {
                    $account_transactions->where('km8_parent_payment_transactions.mode', $filters->type);
                }

                if (isset($filters->parent) && !empty($filters->parent)) {
                    $account_transactions->where('km8_users.id', Helpers::decodeHashedID($filters->parent));
                }

                if (isset($filters->child) && !empty($filters->child)) {
                    $account_transactions->where('km8_child_profile.id', Helpers::decodeHashedID($filters->child));
                }

                if (isset($filters->reversed) && $filters->reversed === false) {
                    $account_transactions->where('km8_parent_payment_transactions.reversed', '=', 'false');
                }

                if (isset($filters->parent_status) && $filters->parent_status !== 'all') {

                    $account_transactions->where('km8_users.status', '=', $filters->parent_status);

                }

            }

            //search
            if (!is_null($searchValue)) {

                $account_transactions->whereLike([
                    'km8_users.first_name',
                    'km8_users.last_name',
                    'km8_child_profile.first_name',
                    'km8_child_profile.last_name'
                ], $searchValue);

            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $account_transactions->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $account_transactions->orderBy('km8_parent_payment_transactions.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $account_transactions = $account_transactions
                ->paginate($offset);

            return (new ParentPaymentTransactionResourceCollection($account_transactions, ['financeStatementData' => true]))
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
