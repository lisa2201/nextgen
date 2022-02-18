<?php

namespace Kinderm8\Http\Controllers;

use CCSHelpers;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\CCSEnrolmentImportMigrateRequest;
use Kinderm8\Http\Requests\CCSEnrolmentImportRequest;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Http\Resources\FeesResourceCollection;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Repositories\Booking\IBookingRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\CCSEnrolment\ICCSEnrolmentRepository;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Fee\IFeeRepository;
use Kinderm8\Repositories\Organization\IOrganizationRepository;
use Kinderm8\Repositories\User\IUserRepository;
use LocalizationHelper;
use Nahid\JsonQ\Jsonq;
use RequestHelper;
use function _\find;
use function _\upperCase;

ignore_user_abort(true);
set_time_limit(0);

class CCSEnrolmentDataMigrationController extends Controller
{
    private $childRepo;
    private $feeRepo;
    private $bookingRepo;
    private $userRepo;
    private $organizationRepo;
    private $branchRepo;
    private $enrolmentRepo;
    private $ccsSetupRepo;

    public function __construct(IChildRepository $childRepo, IFeeRepository $feeRepo, IBookingRepository $bookingRepo, IUserRepository $userRepo, IOrganizationRepository $organizationRepo, IBranchRepository $branchRepo, ICCSEnrolmentRepository $enrolmentRepo, ICCSSetupRepository $ccsSetupRepo)
    {
        $this->childRepo = $childRepo;
        $this->feeRepo = $feeRepo;
        $this->bookingRepo = $bookingRepo;
        $this->userRepo = $userRepo;
        $this->organizationRepo = $organizationRepo;
        $this->branchRepo = $branchRepo;
        $this->enrolmentRepo = $enrolmentRepo;
        $this->ccsSetupRepo = $ccsSetupRepo;
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
            $orgs = $this->organizationRepo
                ->with(['branch'])
                ->get();

            $response = [
                'orgs' => new OrganizationResourceCollection($orgs, [ 'withBranch' => true ])
            ];

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $response
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     * @throws ValidationException
     */
    public function getEnrollments(Request $request)
    {
        try
        {
            // validation
            app(CCSEnrolmentImportRequest::class);

            $org = (! Helpers::IsNullOrEmpty($request->input('org'))) ? Helpers::decodeHashedID($request->input('org')) : null;
            $branch = (! Helpers::IsNullOrEmpty($request->input('branch'))) ? Helpers::decodeHashedID($request->input('branch')) : null;
            $enrollments = ($request->input('enrollments') !== '') ? $request->input('enrollments') : null;

            // get branch
            $branchObj = $this->branchRepo->findById($branch);

            // get auth person id
            $ccs_setup = $this->ccsSetupRepo->findByBranch($branchObj->id, []);

            // if (!is_null($branchObj->providerService) && !is_null($ccs_setup)) \Log::error('service id: ' . $branchObj->providerService->service_id . ' auth person id: ' . $ccs_setup->person_id);

            // get enrollments from api
            $ccs_api_response = CCSHelpers::getEnrollmentsByBranch($ccs_setup, $branchObj->providerService);

            // validate api response
            if (is_null($ccs_api_response) || (is_array($ccs_api_response) && empty($ccs_api_response)))
            {
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('enrolment.enrolments_not_found')
                    ), RequestType::CODE_404);
            }

            // get missing enrolments from csv -> api
            $missing_enrolments = array_unique(array_values(json_decode(json_encode(array_filter($enrollments, function($item) use ($ccs_api_response)
            {
                return !find($ccs_api_response, ['enrolment_id' => $item]);
            })), true)));

            // check if enrolment matches to csv import
            $ccs_api_response = array_filter(array_filter($ccs_api_response, function ($item) use ($enrollments)
            {
                return in_array($item['enrolment_id'], $enrollments);
            }));

            // get data
            $children = $this->childRepo->get([ 'org' => $org, 'branch' => $branchObj->id ], [], $request,false);
            $parents = $this->userRepo->findParentUsers([ 'org' => $org, 'branch' => $branchObj->id ], $request, false);
            $fees = $this->feeRepo->get([ 'org' => $org, 'branch' => $branchObj->id ], [], $request, false);

            // check if data available
            if($children->isEmpty() || $parents->isEmpty() || $fees->isEmpty())
            {
                \Log::error('children count ' . $children->count());
                \Log::error('parents count ' . $parents->count());
                \Log::error('fees count ' . $fees->count());

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_404,
                        LocalizationHelper::getTranslatedText('import-operations.resources_not_found')
                    ), RequestType::CODE_404);
            }

            // group by enrolment id
            $group = Helpers::array_group_by($ccs_api_response, 'enrolment_id');

            // map enrolment data
            $formatList = [];

            $arrayq = new Jsonq();

            foreach ($group as $key => $enrolment)
            {
                // get latest enrollments
                $arrayq->reset();
                $arrayq->collect($enrolment);
                $arrayq->sortBy('last_updated_date_time', 'desc');
                $arrayq->sortBy('record_effective_end_date', 'desc');

                $enrolment = $arrayq->toArray()[0];

                // update status if empty
                if (Helpers::IsNullOrEmpty($enrolment['status']))
                {
                    $statusList = new Jsonq();
                    $statusList->collect($enrolment['statuses']['results']);
                    $statusList->sortBy('time_stamp', 'desc');
                    $statusList = $statusList->toArray();

                    $enrolment['status'] = $statusList[0]['status'];

                    unset($statusList);
                }

                // map session routines
                $sessionList = [];

                if (!empty($enrolment['sessions']['results']))
                {
                    // ignore session of enrolment end date is available
                    if (Helpers::IsNullOrEmpty($enrolment['enrollment_end_date']) || $enrolment['enrollment_end_date'] === '0000-00-00')
                    {
                        foreach ($enrolment['sessions']['results'] as $session)
                        {
                            $session['session_type_label'] = (! Helpers::IsNullOrEmpty($session['sessionType'])) ? CCSType::ENROLMENT_SESSION_INDICATOR[upperCase(substr($session['sessionType'], 0, 1))] : null;
                            $session['session_measure_label'] = (! Helpers::IsNullOrEmpty($session['sessionUnitOfMeasure'])) ? CCSType::ENROLMENT_SESSION_UNIT_OF_MEASURE[$session['sessionUnitOfMeasure']] : null;

                            array_push($sessionList, $session);
                        }
                    }

                    $enrolment['session_indicator_label'] = CCSType::ENROLMENT_SESSION_TYPE[$enrolment['session_indicator']];
                }

                $enrolment['status_label'] = (! Helpers::IsNullOrEmpty($enrolment['status'])) ? CCSType::CCS_STATUS_MAP[$enrolment['status']] : array_keys(CCSType::CCS_STATUS_MAP)[11];

                array_push($formatList, [
                    'session' => $sessionList,
                    'response' => $enrolment
                ]);
            }

            unset($arrayq);

            $response = [
                'children' => new ChildResourceCollection($children, [ 'basic' => true ]),
                'parents' => new UserResourceCollection($parents, [ 'enrolmentImport' => true ]),
                'fees' => new FeesResourceCollection($fees),
                'enrollments' => $formatList,
                'missing' => array_filter($missing_enrolments, 'strlen')
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
            if ($e instanceof ValidationException)
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
    public function migrateEnrolments(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(CCSEnrolmentImportMigrateRequest::class);

            // get branch
            $branchObj = $this->branchRepo
                ->with(['providerService'])
                ->where('organization_id', Helpers::decodeHashedID($request->input('org')))
                ->where('id', Helpers::decodeHashedID($request->input('branch')))
                ->first();

            $this->enrolmentRepo->migrate($request, $branchObj, auth()->user());

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_migration')
                ), RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
