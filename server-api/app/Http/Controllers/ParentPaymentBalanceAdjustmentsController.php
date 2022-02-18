<?php

namespace Kinderm8\Http\Controllers;

use ErrorHandler;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use RequestHelper;
use Helpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Http\Resources\ParentPaymentBalanceAdjustmentHeaderResourceCollection;
use Kinderm8\Http\Resources\ParentPaymentBalanceAdjustmentResourceCollection;
use Kinderm8\ParentPaymentBalanceAdjustment;
use Kinderm8\ParentPaymentTransaction;
use LocalizationHelper;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\User;
use Carbon\Carbon;
use DBHelper;
use Illuminate\Support\Arr;
use Kinderm8\Enums\RoleType;
use Kinderm8\Traits\UserAccessibility;

class ParentPaymentBalanceAdjustmentsController extends Controller
{

    use UserAccessibility;

    private $sortColumnsMap = [
        'date' => 'km8_parent_payment_balance_adjustments.date',
        'description' => 'km8_parent_payment_balance_adjustments.description',
        'amount' => 'km8_parent_payment_balance_adjustments.open_balance',
        'type' => 'km8_parent_payment_balance_adjustments.adjustment_type',
        'parent' => 'km8_users.first_name',
        'created_at' => 'km8_parent_payment_balance_adjustments.created_at'
    ];

    /**
     * list of adjustments
     */
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
            $balance_adjustments = ParentPaymentBalanceAdjustment::whereHas('parent.child', function($query) {
                $query->where('status', '=', '1');
            })
            ->with('parent')
            ->join('km8_users','km8_users.id','=','km8_parent_payment_balance_adjustments.parent_id')
            ->select('km8_parent_payment_balance_adjustments.*');

            $balance_adjustments = $this->attachAccessibilityQuery($balance_adjustments, null, 'km8_parent_payment_balance_adjustments');

            // if (auth()->user()->isAdministrative())
            // {
            //     $balance_adjustments->where('km8_parent_payment_balance_adjustments.organization_id', '=', auth()->user()->organization_id)
            //         ->where('km8_parent_payment_balance_adjustments.branch_id', '=', auth()->user()->branch_id);
            // }

            //get actual count
            $actualCount = $balance_adjustments->get()->count();

            //filters
            if (!is_null($filters)) {

                if (isset($filters->date) && !empty($filters->date)) {
                    $balance_adjustments->where('km8_parent_payment_balance_adjustments.date', $filters->date);
                }

                if (isset($filters->type) && $filters->type !== '0') {
                    $balance_adjustments->where('km8_parent_payment_balance_adjustments.adjustment_type', $filters->type);
                }
            }

            //search
            if (!is_null($searchValue)) {
                $balance_adjustments->whereLike([
                    'km8_users.first_name',
                    'km8_users.last_name',
                    'km8_parent_payment_balance_adjustments.description'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {

                $balance_adjustments->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );

            } else {
                $balance_adjustments->orderBy('km8_parent_payment_balance_adjustments.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $balance_adjustments = $balance_adjustments
                ->paginate($offset);

            return (new ParentPaymentBalanceAdjustmentResourceCollection($balance_adjustments, []))
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

    /**
     * create adjustment
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function createAdjustment(Request $request)
    {

        DB::beginTransaction();

        try {

            /*-----------------------------------------------------------*/
            /* validate request */
            /*-----------------------------------------------------------*/

            $validator = Validator::make($request->all(), [
                'account' => ['required'],
                'type' => ['required'],
                'amount' => ['required'],
                'description' => ['required'],
                'date' => ['required']
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
            $parent_id = Helpers::decodeHashedID($request->input('account'));

            // $existing_count = ParentPaymentTransaction::where('parent_id', '=', $parent_id)->count();

            // if($existing_count > 0) {
            //     return response()->json(
            //         RequestHelper::sendResponse(
            //             RequestType::CODE_400,
            //             LocalizationHelper::getTranslatedText('payment.parent_payment_balance_adjustment_not_allowed')
            //         ),
            //         RequestType::CODE_400
            //     );
            // }

            $adjustmentDetail = new ParentPaymentBalanceAdjustment();
            $adjustmentDetail->organization_id = $org_id;
            $adjustmentDetail->branch_id = $branch_id;
            $adjustmentDetail->date = $request->input('date');
            $adjustmentDetail->adjustment_type = $request->input('type');
            $adjustmentDetail->open_balance = $request->input('amount');
            $adjustmentDetail->description = $request->input('description');
            $adjustmentDetail->parent_id = $parent_id;
            $adjustmentDetail->save();


            $statement = new ParentPaymentTransaction();
            $statement->organization_id = $org_id;
            $statement->branch_id = $branch_id;
            $statement->parent_id = $parent_id;
            $statement->ref_id = $adjustmentDetail->id;
            $statement->date =  $request->input('date');
            $statement->transaction_type = 'account_balance';
            $statement->mode = $request->type == 'credit' ? 'credit' : 'debit';
            $statement->description = $request->input('description');
            $statement->amount = $request->input('amount');
            $statement->running_total = $request->type == 'credit' ? (((double) $request->input('amount')) * -1) : $request->input('amount');

            $statement->save();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                    // new PaymentInformationsResource($payment)
                ),
                RequestType::CODE_200
            );
        } catch (Exception $e) {
            DB::rollBack();
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
     * parent list
     */
    public function listOfParents(Request $request)
    {

        try {

            $data = User::where('organization_id', '=', auth()->user()->organization_id)
                ->where('branch_id', '=', auth()->user()->branch_id)
                // ->whereHas('child', function($query) {
                //     $query
                //         ->where('primary_payer', '=', true)
                //         ->where('status', '=', '1');
                // })
                // ->Active()
                ->whereHas('roles', function($query)
                {
                    $query->where('type', RoleType::PARENTSPORTAL);
                })
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new UserResourceCollection($data)
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
