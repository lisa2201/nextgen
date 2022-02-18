<?php

namespace Kinderm8\Http\Controllers;

use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Cache;
use CacheHelper;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Kinderm8\Enums\RequestType;
use Kinderm8\BondPayment;
use Kinderm8\User;
use Kinderm8\Http\Resources\BondPaymentResource;
use Kinderm8\Http\Resources\BondPaymentResourceCollection;
use LocalizationHelper;
use RequestHelper;
use Log;


class BondPaymentController extends Controller
{
    public function get(Request $request)
    {
        $bondList = [];
        $actualCount = 0;
        $displayCount = 0;
        $filters = null;

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 10;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters'), true) : null;

            //query builder
            $bondList = BondPayment::with(['user','child']);

            $bondList->where('organization_id', '=', auth()->user()->organization_id)
                    ->where('branch_id', '=', auth()->user()->branch_id);
            $actualCount = $bondList->get()->count();

            //filters
                        //filters
            if(!is_null($filters))
            {
                // Log::info($filters);
                if(isset($filters['date']) && !is_null($filters['date']))
                {
                    // Log::info('filter work');
                    $bondList->where('date', '=', $filters['date']);
                }

                if(isset($filters['type']) && !is_null($filters['type']))
                {
                    $bondList->where('type', '=', $filters['type']);
                }

                if(isset($filters['amount']) && $filters['amount']  !=='')
                {
                    $bondList->where('amount', $filters['amount']);
                }

                if(isset($filters['comments']) && !is_null($filters['comments']))
                {
                    $bondList->where('comments', $filters['comments']);
                }

                if(isset($filters['user']) && $filters['user'] !== '')
                {
                    $user_id = Helpers::decodeHashedID($filters['user']);

                    $bondList->where('user_id', $user_id);
                }

                if(isset($filters['child']) && $filters['child'] !== '')
                {
                    $child_id = Helpers::decodeHashedID($filters['child']);

                    $bondList->where('child_id', $child_id);
                }

                if (isset($filters['parent_status']) && $filters['parent_status'] !== 'all') {

                    $bondList->whereHas('user', function ($query) use($filters) {
                        $query->where('status', '=', $filters['parent_status']);
                    });

                }
            }

            //search
            if(!is_null($searchValue))
            {
                // Log::info($searchValue);
                // $bondList->whereLike([
                //     'km8_bond_payemt.amount',
                //     'km8_bond_payemt.comments'
                // ], $searchValue);
                $bondList->where(function ($query) use ($searchValue) {
                    $query->where('amount', 'ILIKE', '%' . $searchValue . '%')
                        ->orWhere('comments', 'ILIKE', '%' . $searchValue . '%')
                        ->orWhereHas('user', function ($chquery) use ($searchValue) {
                            $chquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%');
                        })
                        ->orWhereHas('child', function ($chquery) use ($searchValue) {
                            $chquery->where('first_name', 'ILIKE', '%' . $searchValue . '%')->orWhere('last_name', 'ILIKE', '%' . $searchValue . '%');
                        });
                });
            }

            $displayCount = $bondList->get()->count();

            $bondList = $bondList
                ->orderBy('date', 'desc')
                ->paginate($offset);

                // Log::info($bondList);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new BondPaymentResourceCollection($bondList))
             ->additional([
                'totalRecords' => $actualCount,
                'displayRecord' =>$displayCount,
                'filtered' => !is_null($filters) && (isset($filters) && $filters !== '0')
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);

    }

    public function store(request $request)
    {
         DB::beginTransaction();

        try
        {

            $organization_id = auth()->user()->organization_id;
            $branch_id =  auth()->user()->branch_id;


            // create organization record
            $newObj = new BondPayment();
            //required fields
            $newObj->amount = $request->input('amount');
            $newObj->date = $request->input('date');
            $newObj->organization_id = $organization_id;
            $newObj->branch_id = $branch_id;
            $newObj->comments = $request->input('comments');
            $newObj->type = $request->input('type');
            $newObj->child_id = Helpers::decodeHashedID($request->input('child'));
            $newObj->user_id = Helpers::decodeHashedID($request->input('user'));

            $newObj->save();

            DB::commit();

            return response()->json(RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_create'),
                new BondPaymentResource($newObj)
            ), RequestType::CODE_201);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function update(request $request)
    {
         DB::beginTransaction();

        try
        {
            // if(auth()->user()->hasRole('portal-admin'))
            // {
            //     $organization_id = null;
            //     $branch_id = null;
            // }
            // else
            // {
            //    $organization_id = auth()->user()->organization_id;
            //    $branch_id = (auth()->user()->hasRole('portal-org-admin')) ? null : auth()->user()->branch_id;
            // }

            $organization_id = auth()->user()->organization_id;
            $branch_id = auth()->user()->branch_id;

            $id = Helpers::decodeHashedID($request->input('id'));

            $bond = BondPayment::find($id);

            if (is_null($bond))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            //required fields
            $bond->amount = $request->input('amount');
            $bond->date = $request->input('date');
            $bond->organization_id = $organization_id;
            $bond->branch_id = $branch_id;
            $bond->comments = $request->input('comments');
            $bond->type = $request->input('type');
            $bond->child_id = Helpers::decodeHashedID($request->input('child'));
            $bond->user_id = Helpers::decodeHashedID($request->input('user'));

            $bond->save();

            DB::commit();

            return response()->json(RequestHelper::sendResponse(
                RequestType::CODE_201,
                LocalizationHelper::getTranslatedText('response.success_create'),
                new BondPaymentResource($bond)
            ), RequestType::CODE_201);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function delete(Request $request)
    {
        DB::beginTransaction();
        $actualCount = 0;

        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));

            $bond = BondPayment::find($id);

            if (is_null($bond))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            $bond->delete();

             //  Query builder

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

}
