<?php

namespace Kinderm8\Http\Controllers;

use DB;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\StoreAdjustFeeRequest;
use Kinderm8\Http\Resources\AdjustedFeeResource;
use Kinderm8\Http\Resources\AdjustedFeeResourceCollection;
use Kinderm8\Http\Resources\FeesResource;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Traits\UserAccessibility;

class FeesController extends Controller
{
    use UserAccessibility;

    private $feeRepo;
    private $bookingRepo;
    private $roomRepo;

    public function __construct(IFeeRepository $feeRepo, IBookingRepository $bookingRepo, IRoomRepository $roomRepo)
    {
        $this->feeRepo = $feeRepo;
        $this->bookingRepo = $bookingRepo;
        $this->roomRepo = $roomRepo;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function get(Request $request)
    {
        $data = $this->feeRepo->list($request);

        return (new FeesResourceCollection($data['list'], [ 'adjusted_past_future' => true ]))
            ->additional([
                'totalRecords' => $data['totalRecords'],
                'displayRecord' => $data['displayRecord'],
                'filtered' => $data['filtered'],
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getDependency(Request $request)
    {
        try
        {
            $rooms = $this->roomRepo->get(
                [ 'status' => '0', 'admin_only' => false ],
                [],
                $request,
                false
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new RoomResourceCollection($rooms)
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
     * @throws Exception
     */
    public function store(request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation

            $rooms = ($request->input('rooms') !== '' && !empty($request->input('rooms'))) ? $this->roomRepo->get([
                'ids' => Helpers::decodeHashedID($request->input('rooms'))
            ], [], $request, false)->pluck('id')->toArray() : [];

            $newObj = $this->feeRepo->store($request, $rooms);

            DB::commit();

            return response()
                ->json(RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new FeesResource($newObj)
                ), RequestType::CODE_201);
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->feeRepo->findById(Helpers::decodeHashedID($request->input('index')),
                [ 'adjusted_past_collection', 'bookings', 'rooms' ],
                false);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new FeesResource($rowObj, [ 'adjusted_past_future' => true ])
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
     * @throws ValidationException
     * @throws Exception
     */
    public function update(request $request)
    {
        DB::beginTransaction();

        try
        {
            $rooms = ($request->input('rooms') !== '' && !empty($request->input('rooms'))) ? $this->roomRepo->get([
                'ids' => Helpers::decodeHashedID($request->input('rooms'))
            ], [], $request, false)->pluck('id')->toArray() : [];

            $rowObj = $this->feeRepo->update(Helpers::decodeHashedID($request->input('id')), $request, $rooms);

            DB::commit();

            return response()
                ->json(RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new FeesResource($rowObj)
                ), RequestType::CODE_201);
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     * @throws Exception
     */
    public function updateStatus(Request $request)
    {

        DB::beginTransaction();

        try
        {
            $fee = $this->feeRepo->updateStatus(Helpers::decodeHashedID($request->input('id')), $request);

            DB::commit();

            return response()
                ->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_update'),
                        new FeesResource($fee)
                    ), RequestType::CODE_201);
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));

            if (!$this->bookingRepo->findByFeeId($id, [], [],false, $request, false)->isEmpty())
            {
                throw new Exception(LocalizationHelper::getTranslatedText('fee.bookings_available_warning'), ErrorType::CustomValidationErrorCode);
            }

            $this->feeRepo->delete($id);

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

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /*-------------------------------------------------------------*/

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws Exception
     */
    public function getAdjustedList(Request $request)
    {
        try
        {
            $adjustedList = $this->feeRepo->getAdjustedList($request, [ 'creator' ]);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new AdjustedFeeResourceCollection($adjustedList)
                ), RequestType::CODE_201);
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
    public function adjust(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(StoreAdjustFeeRequest::class);

            // check if adjusted fee available for selected date
            $adjusted_found = $this->feeRepo->getAdjusted(Helpers::decodeHashedID($request->input('id')), [
                'date' => $request->input('eDate')
            ], [], $request);

            // update adjusted fee
            if (!$adjusted_found->isEmpty())
            {
                $adjusted_found->first()->update([
                    'created_by' => auth()->user()->id,
                    'net_amount' => $request->input('nAmount'),
                    'future_bookings_updated' => (! Helpers::IsNullOrEmpty($request->input('update_bookings'))) ? filter_var($request->input('update_bookings'), FILTER_VALIDATE_BOOLEAN) : false
                ]);

                $obj = $adjusted_found->first();
            }
            // store adjusted fee
            else
            {
                $obj = $this->feeRepo->storeAdjustFee($request);
            }

            // update booking fees
            if (! Helpers::IsNullOrEmpty($request->input('update_bookings')) && $request->input('update_bookings'))
            {
                $this->bookingRepo->updateFees($obj);
            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new AdjustedFeeResource($obj)
                ), RequestType::CODE_201);
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
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws Exception
     */
    public function deleteAdjusted(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $object = $this->feeRepo->findAdjustedById(Helpers::decodeHashedID($request->input('id')),
                [],
                ['with_booking_count' => true ],
                false);

            if ($object->bookings_count > 0)
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('fee.bookings_adjustment_available_warning')
                    ), RequestType::CODE_400);
            }

            $this->feeRepo->deleteAdjustedFee($object->id);

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

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
