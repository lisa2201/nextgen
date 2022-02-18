<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\VisitorDetails;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Controllers\Controller;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\VisitorDetailResourceResource;
use Kinderm8\Http\Resources\VisitorDetailResourceCollection;
use Kinderm8\Repositories\VisitorDetails\IVisitorDetailsRepository;
use LocalizationHelper;
use RequestHelper;
use Log;

class VisitorDetailsController extends Controller
{
    private $visitorDetailsRepo;

    public function __construct(IVisitorDetailsRepository $visitorDetailsRepo)
    {
        $this->visitorDetailsRepo = $visitorDetailsRepo;
    }

    public function deviceGetStaffList()
    {
        try
        {
            $staff = $this->visitorDetailsRepo->getStaffList('User');

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    new UserResourceCollection($staff, ['short' => true])
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function deviceVisitorsignIn(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->visitorDetailsRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);

        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function todaySignedInVisitorByMobile(Request $request)
    {
        try
        {
            $today = strtolower(Carbon::now()->format('Y-m-d'));

            $visitor = VisitorDetails::where('branch_id', '=', RequestHelper::getBranchId())
                ->where('mobile_number', '=', $request->input('mobile'))
                ->whereDate('sign_in', '=', $today)
                ->orderBy('id', 'DESC')
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new VisitorDetailResourceCollection($visitor)
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceGetVisitorList(Request $request)
    {
        try
        {
            $visitors = VisitorDetails::where('branch_id', '=', RequestHelper::getBranchId())
                ->whereDate('sign_in', '=', $request->input('date'))
                ->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    new VisitorDetailResourceCollection($visitors)
                ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceGetVisitor(Request $request)
    {
        try
        {
            $visitor = VisitorDetails::where('branch_id', '=', RequestHelper::getBranchId())
                ->where('id', '=', Helpers::decodeHashedID($request->input('id')))
                ->get();

            if($visitor){
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        new VisitorDetailResourceCollection($visitor)
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_400);
            }


        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function deviceVisitorsignOut(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $record = $this->visitorDetailsRepo->signoutVisitor(Helpers::decodeHashedID($request->input('id')));

            if($record){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_create')
                    ), RequestType::CODE_201);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_400);

            }

        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function deviceGetVisitorDetails(Request $request)
    {
        try
        {
            $child_id = Helpers::decodeHashedID($request->input('child_id'));
            // date filter to be implemented

            //$request_details = VisitorDetails::where('branch_id', '=', $request->input('branch_id'))->get();

            // return response()->json(
            //     RequestHelper::sendResponse(
            //         RequestType::CODE_200,
            //         LocalizationHelper::getTranslatedText('response.success_request'),
            //         new BookingRequestResourceCollection($request_details, [ 'basic' => true])
            //     ), RequestType::CODE_200);

        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceUpdate(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // get branch item
            $rowObj = $this->visitorDetailsRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            if($rowObj){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_update')
                    ), RequestType::CODE_200);

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_400,
                    LocalizationHelper::getTranslatedText('response.resource_not_found')
                ), RequestType::CODE_400);

        }
        catch (Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete booking object
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function deviceDelete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $removed_object = $this->visitorDetailsRepo->delete(Helpers::decodeHashedID($request->input('id')));

            if($removed_object){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_delete')
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_400);

            }

        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getstafflist(Request $request)
    {
        DB::beginTransaction();

        try
        {
           // String query = "SELECT * FROM users WHERE isAdmin = '1' OR isStaff = '1' and deleted_at IS NULL";
            $record = $this->visitorDetailsRepo->signoutVisitor(Helpers::decodeHashedID($request->input('id')));

            if($record){
                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_delete')
                    ), RequestType::CODE_200);

            }else{
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('response.resource_not_found')
                    ), RequestType::CODE_400);

            }

        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
