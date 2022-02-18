<?php

namespace Kinderm8\Http\Controllers;

use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use ErrorHandler;
use Exception;
use Helpers;
use CCSHelpers;
use DateTimeHelper;
use Kinderm8\Enums\CCSType;
use Illuminate\Http\JsonResponse;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\CCSEnrolmentResourceCollection;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Traits\UserAccessibility;

class CCMSReportController extends Controller
{

    private $enrolmentRepo;
    private $childRepo;


    private $snsService;

    public function __construct(ICCSEnrolmentRepository $enrolmentRepo, IChildRepository $childRepo)
    {
        $this->enrolmentRepo = $enrolmentRepo;
        $this->childRepo = $childRepo;

    }

    public function CCSEnrolmentReport(Request $request)
    {
        try {

            $child_id = null;
            $child_data = [

                'id'=> $child_id,
                'isRoomSelect'=> false
            ];

            if($request->input('room')) {

                $child_id = $this->childRepo->getChildIdInRoom($request);
                $child_data = [

                    'id'=> $child_id,
                    'isRoomSelect'=> true
                ];
            }

            $enrolments = $this->enrolmentRepo->CCSEnrolmentReport($request, $child_data);


            return (new CCSEnrolmentResourceCollection($enrolments['list']))
                ->additional([
                    'totalRecords' => $enrolments['actual_count'],
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);


        } catch (Exception $e) {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    $e->getCode() === 1000 ? $e->getMessage() : LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );

        }
    //         ->setStatusCode(RequestType::CODE_200);
        // }

//         ->setStatusCode(RequestType::CODE_200);
        // }

    }

}
