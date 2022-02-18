<?php

namespace Kinderm8\Http\Controllers;

use DBHelper;
use ErrorHandler;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;
use Helpers;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Kinderm8\AdjustmentItem;
use Kinderm8\Child;
use Kinderm8\Http\Resources\AdjustmentItemResourceCollection;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\ParentPaymentAdjustmentHeaderResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\ParentPaymentAdjustment;
use Kinderm8\ParentPaymentAdjustmentsHeader;
use Kinderm8\ParentPaymentTransaction;
use Kinderm8\Room;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use PaymentHelpers;

class ParentPaymentAdjustmentsController extends Controller
{
    use UserAccessibility;

    private $sortColumnsMap = [
        'start_date' => 'km8_parent_payment_adjustments_headers.start_date',
        'amount' => 'km8_parent_payment_adjustments_headers.amount',
        'type' => 'km8_parent_payment_adjustments_headers.type',
        'created_at' => 'km8_parent_payment_adjustments_headers.created_at'
    ];

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function list(Request $request)
    {
        $actualCount = 0;
        $filters = null;
        $time_start = microtime(true);

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
            $financial_adjustments = ParentPaymentAdjustmentsHeader::with(['details.child', 'item']);


            $financial_adjustments = $this->attachAccessibilityQuery($financial_adjustments);

            //get actual count
            $actualCount = $financial_adjustments->get()->count();

            //filters
            if (!is_null($filters))
            {
                if (isset($filters->date) && !empty($filters->date)) {
                    $financial_adjustments->where('start_date', $filters->date);
                }

                if (isset($filters->type) && $filters->type !== '0') {
                    $financial_adjustments->where('type', $filters->type);
                }

                if (isset($filters->item) && !empty($filters->item)) {
                    $financial_adjustments->whereHas('item', function($query) use($filters) {
                        $query->where('id',  Helpers::decodeHashedID($filters->item));
                    });
                }
            }

            //search
            if (!is_null($searchValue)) {

                $financial_adjustments->whereHas('details', function($query) use($searchValue){
                    $query->whereHas('child', function($detailquery) use($searchValue) {
                        $detailquery->where('first_name', 'ILIKE', '%'.$searchValue.'%')
                            ->orWhere('last_name', 'ILIKE', '%'.$searchValue.'%');
                    });
                });

            }

            // sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {

                $financial_adjustments->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );

            } else {
                $financial_adjustments->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $financial_adjustments = $financial_adjustments
                ->paginate($offset);

            return (new ParentPaymentAdjustmentHeaderResourceCollection($financial_adjustments, []))
                ->additional([
                    'totalRecords' => $actualCount,
                    'filtered' => !is_null($filters)
                ])
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

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getChildList(Request $request)
    {
        try
        {
            try
            {
                if($request->input('data')) {
                    $dec_data = json_decode($request->input('data'),true);
                    $room_ids = isset($dec_data['room_ids']) && $dec_data['room_ids'] ? $dec_data['room_ids'] : [];
                    $parent_id = isset($dec_data['parent_id']) && $dec_data['parent_id'] ? Helpers::decodeHashedID($dec_data['parent_id']) : null;
                    $inactive = isset($dec_data['inactive_children']) && ($dec_data['inactive_children'] == true) ? true : false;
                }
            }
            catch (Exception $e)
            {
                $room_ids = [];
                $parent_id = null;
            }

            $room_ids = $request->input('data') ?  Helpers::decodeHashedID($room_ids) : [];

            $child_list = [];

            $child_list = Child::where('organization_id', '=', auth()->user()->organization_id)
                ->whereHas('parents', function($query) use($parent_id) {
                    $query->where('primary_payer', '=', true);
                })
                ->where('branch_id', '=', auth()->user()->branch_id);

            if($room_ids && count($room_ids) > 0)
            {
                $child_list = $child_list->whereHas('rooms', function($query) use($room_ids) {
                    $query->whereIn('id', $room_ids);
                });
            }

            if(!is_null($parent_id))
            {
                $child_list = $child_list->whereHas('parents', function($query) use($parent_id) {
                    $query->where('id', $parent_id);
                });
            }

            if($inactive === false)
            {
                $child_list = $child_list->where('status', '=', '1');
            }

            $child_list = $child_list->orderBy('first_name')->orderBy('last_name')->get();

            return (new ChildResourceCollection($child_list))
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

    public function getRoomList(Request $request)
    {
        try {

            $room_list = [];

            $room_list = Room::where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->where('admin_only','!=',true)
                ->Active()
                ->orderBy('title')
                ->get();

            return (new RoomResourceCollection($room_list, ['short' => true]))->response()->setStatusCode(RequestType::CODE_200);

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

    public function getAdjustmentItems()
    {
        try
        {
            $item_list = [];

            $item_list = AdjustmentItem::where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                ->orderBy('name')
                ->get();

            return (new AdjustmentItemResourceCollection($item_list, []))
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

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'children' => ['required'],
                'type' => ['required'],
                'item' => ['required'],
                'date' => ['required'],
                'amount' => ['required'],
                'scheduled' => ['required']
            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $org_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;
            $schedule_valid = false;

            if (Carbon::createFromFormat('Y-m-d', $request->input('date'))->isFuture()) {
                $schedule_valid = true;
            }

            $adjustmentHeader = new ParentPaymentAdjustmentsHeader();
            $adjustmentHeader->organization_id = $org_id;
            $adjustmentHeader->branch_id = $branch_id;
            $adjustmentHeader->item_id = Helpers::decodeHashedID($request->input('item'));
            $adjustmentHeader->start_date = $request->input('date');
            $adjustmentHeader->end_date = $request->input('date');
            $adjustmentHeader->type = $request->input('type') == 'credit' ? 'other_fee' : 'discount';
            $adjustmentHeader->amount = $request->input('amount');
            $adjustmentHeader->comments = $request->input('comments');
            $adjustmentHeader->scheduled = $schedule_valid ? $request->input('scheduled') : false;

            $adjustmentHeader->save();

            $children = $request->input('children');

            foreach ($children as $child)
            {
                $dec_child_id = Helpers::decodeHashedID($child);

                $adjustmentDetail = new ParentPaymentAdjustment();
                $adjustmentDetail->organization_id = $org_id;
                $adjustmentDetail->branch_id = $branch_id;
                $adjustmentDetail->child_id = $dec_child_id;
                $adjustmentDetail->item_id = Helpers::decodeHashedID($request->input('item'));
                $adjustmentDetail->adjustments_header_id = $adjustmentHeader->id;
                $adjustmentDetail->date = $request->input('date');
                $adjustmentDetail->scheduled = $schedule_valid ? $request->input('scheduled') : false;

                $adjustmentDetail->save();

                $child_data = Child::with(['parents'])->find($dec_child_id);

                $parent_data = $child_data->primaryPayer();

                if ($parent_data) {

                    $runn_total = 0;

                    $last_rec = ParentPaymentTransaction::where('parent_id', $parent_data->id)->orderBy('id', 'desc')->limit(1)->get();

                    if(count($last_rec) > 0) {
                        $runn_total = (double) $last_rec[0]['running_total'];
                    }

                    $req_amount = (double) $request->input('amount');

                    if($request->type == 'credit') {
                        $runn_total = $runn_total - $req_amount;
                    } else {
                        $runn_total = $runn_total + $req_amount;
                    }

                    if (!$request->input('scheduled') || !$schedule_valid) {

                        // Do not insert transaction if scheduled

                        $statement = new ParentPaymentTransaction();
                        $statement->organization_id = $org_id;
                        $statement->branch_id = $branch_id;
                        $statement->parent_id = $parent_data->id;
                        $statement->child_id = $dec_child_id;
                        $statement->ref_id = $adjustmentDetail->id;
                        $statement->date = $request->input('date');
                        $statement->transaction_type = 'adjustment';
                        $statement->mode = $request->type == 'credit' ? 'credit' : 'debit';
                        $statement->description = $request->input('comments');
                        $statement->amount = $request->input('amount');
                        $statement->running_total = $runn_total;

                        $statement->save();

                    }


                } else {
                    throw new Exception('Primary payer not found', 1000);
                }

            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );

        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function deleteAdjustment(Request $request)
    {
        try
        {
            $validator = Validator::make($request->all(), [
                'id' => ['required']
            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $adjustment_header = ParentPaymentAdjustmentsHeader::findOrFail(Helpers::decodeHashedID($request->input('id')));

            $adjustment_header->details()->delete();
            $adjustment_header->delete();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );

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

    public function reverseAdjustment(Request $request)
    {
        try
        {
            $validator = Validator::make($request->all(), [
                'id' => ['required']
            ]);

            if ($validator->fails()) {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );
            }

            $adjustment_header = ParentPaymentAdjustmentsHeader::with('details')->findOrFail(Helpers::decodeHashedID($request->input('id')));

            $adjustment_transactions = ParentPaymentTransaction::whereIn('ref_id', $adjustment_header->details->pluck('id'))
                ->where('reversed', '=', false)
                ->where('transaction_type', '=', PaymentHelpers::PARENT_PAYMENT_TRANSACTION_TYPES[4])
                ->get();

            foreach ($adjustment_header->details as $adjustment_detail) {

                $existing_index = array_search($adjustment_detail->id, array_column($adjustment_transactions->toArray(), 'ref_id'));

                if ($existing_index !== false) {

                    $old_data = $adjustment_transactions[$existing_index];
                    // inverse for reverse
                    $mode = ($old_data->mode === PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0]) ? PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[1] : PaymentHelpers::PARENT_PAYMENT_TRANSACTION_MODE[0];
                    $running_total = PaymentHelpers::getRunningTotal($old_data->parent_id, false, $old_data->amount, $mode);

                    $newReversal = new ParentPaymentTransaction();
                    $newReversal->organization_id = $adjustment_header->organization_id;
                    $newReversal->branch_id = $adjustment_header->branch_id;
                    $newReversal->parent_id = $old_data->parent_id;
                    $newReversal->child_id = $old_data->child_id;
                    $newReversal->ref_id = $adjustment_detail->id;
                    $newReversal->date = $adjustment_detail->date;
                    $newReversal->transaction_type = PaymentHelpers::PARENT_PAYMENT_TRANSACTION_TYPES[4];
                    $newReversal->mode = $mode;
                    $newReversal->description = $old_data->description;
                    $newReversal->amount = $old_data->amount;
                    $newReversal->running_total = $running_total;
                    $newReversal->reverse_ref = $old_data->id;
                    $newReversal->reversed = true;

                    $newReversal->save();

                    $old_data->reversed = true;
                    $old_data->save();

                }


            }

            $adjustment_header->reversed = true;
            $adjustment_header->save();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('payment.financial_adjustment_reversed')
                ),
                RequestType::CODE_200
            );

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
