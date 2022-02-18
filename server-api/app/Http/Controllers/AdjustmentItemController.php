<?php

namespace Kinderm8\Http\Controllers;

use DBHelper;
use ErrorHandler;
use Exception;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Controllers\Controller;
use RequestHelper;
use Helpers;
use Illuminate\Support\Arr;
use Kinderm8\AdjustmentItem;
use Kinderm8\Http\Resources\AdjustmentItemResourceCollection;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class AdjustmentItemController extends Controller
{

    use UserAccessibility;

    private $sortColumnsMap = [
        'name' => 'name',
        'description' => 'description'
    ];

    public function list(Request $request)
    {

        $actualCount = 0;
        $filters = null;

        try {
            //pagination
            $offset = (!Helpers::IsNullOrEmpty($request->get('offset'))) ? (int) $request->get('offset') : 5;

            //search
            $searchValue = (!Helpers::IsNullOrEmpty($request->get('search'))) ? Helpers::sanitizeInputString($request->get('search'), true) : null;

            //sort
            $sortOption = (!Helpers::IsNullOrEmpty($request->get('sort')) && is_null($searchValue)) ? json_decode($request->get('sort')) : null;

            //filters
            $filters = (!Helpers::IsNullOrEmpty($request->get('filters'))) ? json_decode($request->get('filters')) : null;

            //query builder
            $adjustment_items = AdjustmentItem::whereNull('deleted_at');

            $adjustment_items = $this->attachAccessibilityQuery($adjustment_items);

            //get actual count
            $actualCount = $adjustment_items->get()->count();

            //filters
            if (!is_null($filters)) {

                // Filter logic here

            }

            //search
            if (!is_null($searchValue)) {
                $adjustment_items->whereLike([
                    'name',
                    'description'
                ], $searchValue);
            }

            //sorting
            if (!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value))) {
                $adjustment_items->orderBy(
                    Arr::get($this->sortColumnsMap, $sortOption->key),
                    Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
                );
            } else {
                $adjustment_items->orderBy('id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            }

            $adjustment_items = $adjustment_items
                ->paginate($offset);

            return (new AdjustmentItemResourceCollection($adjustment_items, []))
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

    public function create(Request $request)
    {

        try {

            $item = new AdjustmentItem();
            $item->organization_id = auth()->user()->organization_id;
            $item->branch_id = auth()->user()->branch_id;
            $item->name = $request->input('name');
            $item->description = $request->input('description');
            $item->save();

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

    public function update(Request $request)
    {

        try {

            $dec_id = Helpers::decodeHashedID($request->input('id'));

            $item = AdjustmentItem::findOrFail($dec_id);
            $item->name = $request->input('name');
            $item->description = $request->input('description');
            $item->save();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );
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

    public function delete(Request $request)
    {

        try {

            $dec_id = Helpers::decodeHashedID($request->input('id'));

            $item = AdjustmentItem::findOrFail($dec_id);
            $item->delete();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );

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
