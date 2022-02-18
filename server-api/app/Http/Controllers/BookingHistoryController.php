<?php

namespace Kinderm8\Http\Controllers;

use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use RequestHelper;

class BookingHistoryController extends Controller
{
    use UserAccessibility;

    private $bookingRepo;
    private $childRepo;
    private $roomRepo;
    private $feeRepo;

    public function __construct(IBookingRepository $bookingRepo, IChildRepository $childRepo, IRoomRepository $roomRepo, IFeeRepository $feeRepo)
    {
        $this->bookingRepo = $bookingRepo;
        $this->childRepo = $childRepo;
        $this->roomRepo = $roomRepo;
        $this->feeRepo = $feeRepo;
    }

    public function get(Request $request)
    {
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request')
            ), RequestType::CODE_200);
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
            //get children
            $children = $this->childRepo->get([
                'start_date_validation' => true,
                'status' => '1',
                'order' => [
                    'column' => 'first_name',
                    'value' => 'asc'
                ]
            ], [], $request, false);

            //get rooms
            $rooms = $this->roomRepo->get([ 'status' => '0' ], [], $request, false);

            //get fees
            $fees = $this->feeRepo->get([ 'status' => '0' ], [], $request, false);

            $response = [
                'children' => new ChildResourceCollection($children, [ 'basic' => true ]),
                'rooms' => new RoomResourceCollection($rooms),
                'fees' => new FeesResourceCollection($fees),
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
