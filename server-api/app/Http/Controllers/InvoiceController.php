<?php

namespace Kinderm8\Http\Controllers;

use DBHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\InvoiceResource;
use Kinderm8\Http\Resources\InvoiceResourceCollection;
use Kinderm8\Invoice;
use Kinderm8\Organization;
use LocalizationHelper;
use RequestHelper;

class InvoiceController extends Controller
{

    private $sortColumnsMap = [
        'number' => 'id',
        'start_date' => 'start_date',
        'end_date' => 'end_date',
        'subtotal' => 'subtotal',
        'due_date' => 'due_date',
        'status' => 'status',
    ];

    public function listInvoice(Request $request)
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
            $invoices = Invoice::with(['invoice_items', 'organization']);

            if (auth()->user()->hasOwnerAccess()) {
                $invoices->where('organization_id', '=', auth()->user()->organization_id);
            }

            //get actual count
            $actualCount = $invoices->get()->count();

            //filters
            if (!is_null($filters)) {

                $status_arr = [null,'failed', 'paid', 'past_due', 'pending', 'schedueld', 'submitted', 'rejected_gateway'];

                if (isset($filters->status) && $filters->status !== '0') {
                    // $invoices->whereRaw("DATE(km8_user_invitations.expires_at) " . (($filters->status === '1') ? "<" : ">") . " '" . Carbon::now()->toDateString() . "'");
                    $invoices->where('status', $status_arr[(int)$filters->status]);
                }

                if (isset($filters->start_date) && $filters->start_date && isset($filters->end_date) && $filters->end_date) {

                    $invoices->where('start_date', '<=', $filters->end_date)->where('end_date', '>=', $filters->start_date);

                }

                if (isset($filters->due_date) && $filters->due_date) {

                    $invoices->where('due_date', '=', $filters->due_date);

                }

            }

            //search
            if (!is_null($searchValue)) {
                $invoices->whereLike([
                    'number'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $invoices->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $invoices->orderBy('km8_invoices.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $invoices = $invoices
                // ->select(['km8_user_invitations.*'])
                ->paginate($offset);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $invoices = [];
        }

        return (new InvoiceResourceCollection($invoices, ['withOrg' => true]))
            ->additional([
                'totalRecords' => $actualCount,
                'filtered' => !is_null($filters)
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);

    }

    public function getInvoice(Request $request)
    {

        try {

            $invoiceId = Helpers::decodeHashedID($request->input('id'));

            $invoice = Invoice::with(['invoice_items','organization'])->find($invoiceId);

            return (new InvoiceResource($invoice, ['withInvoiceItem' => true, 'withOrg' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        }
        catch (Exception $e)
        {
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
