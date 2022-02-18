<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Events\updateSequenceOnRollBackEvent;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\BranchStoreRequest;
use Kinderm8\Http\Requests\BranchUpdateRequest;
use Kinderm8\Http\Resources\BranchResource;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Listeners\updateSequenceOnRollBackListener;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Immunisation\IImmunisationRepository;
use Kinderm8\Repositories\Role\IRoleRepository;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Traits\Subscriber;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\CcsSetup;
use Carbon\Carbon;

class BranchController extends Controller
{
    use Subscriber;

    private $branchRepo;
    private $snsService;
    private $immunisationRepo;

    public function __construct(IBranchRepository $branchRepo, SNSContract $snsService,IImmunisationRepository $immunisationRepo)
    {
        $this->branchRepo = $branchRepo;
        $this->snsService = $snsService;
        $this->immunisationRepo = $immunisationRepo;
    }

    /**
     * get all branches (can be modified later on)
     * @return JsonResponse {array} list list
     */
    public function get()
    {
        try
        {
            $branchList = $this->branchRepo->list([], false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $branchList = [];
        }

         return (new BranchResourceCollection($branchList))
             ->response()
             ->setStatusCode(RequestType::CODE_200);
    }

    /***
     * Store branch object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BranchStoreRequest::class);

            // create branch record
            $newObj = $this->branchRepo->store($request);

            // create default immunisation for this branch
            $immunisation = $this->immunisationRepo->importForBranch($newObj->id, 'ImmunisationSchedule');

            DB::commit();

            //get all fields
            $newObj->refresh();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new BranchResource($newObj)
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
     * View/get branch object
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function edit(Request $request)
    {
        try
        {
            $rowObj = $this->branchRepo->findById(Helpers::decodeHashedID($request->input('index')));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BranchResource($rowObj)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Update branch object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // validation
            app(BranchUpdateRequest::class);

            // get branch item
            $rowObj = $this->branchRepo->update(Helpers::decodeHashedID($request->input('id')), $request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new BranchResource($rowObj)
                ), RequestType::CODE_200);
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
     * Delete branch object
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->branchRepo->delete(Helpers::decodeHashedID($request->input('id')));

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

    /**
     * check if domain exists in database
     * @param Request $request
     * @return mixed
     * @throws ServerErrorException
     */
    public function domainExists(Request $request)
    {
        try
        {
            $value = rtrim($request->input('value'));
            $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;

            $branch = $this->branchRepo->findByDomain($value, $index, false, []);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    !is_null($branch)
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * update branch status
     * @param Request $request
     * @return mixed
     * @throws Exception
     */
    public function updateStatus(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $branch = $this->branchRepo->updateStatus(Helpers::decodeHashedID($request->input('id')), $request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new BranchResource($branch)
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * get branches by auth user
     * @return JsonResponse
     */
    public function getBranchesByAuthUser()
    {
        $branchList = [];

        try
        {
            if(auth()->user()->can('branch-access'))
            {
                $branchList = $this->branchRepo->list(
                    [
                        'deleted' => true,
                        'order' => [
                            'column' => 'name',
                            'value' => 'asc'
                        ]
                    ],
                    false
                );
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new BranchResourceCollection($branchList, [ 'short' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function orgCCSInfo()
    {
        $hasCCS = false;

        try
        {
            if (auth()->user()->hasOwnerAccess())
            {
                $ccsListValid = CcsSetup::where('organization_id', auth()->user()->organization_id);

                $hasCCS = $ccsListValid->where('key_expire', '>', Carbon::now())->get()->count() > 0 ? true : false;
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'hasccs' => $hasCCS
                    ]
                ),
                RequestType::CODE_201
            );
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function getPincode()
    {
        try
        {
            if(auth()->user()->can('branch-access'))
            {
                $rowObj = $this->branchRepo->findById(auth()->user()->branch_id);

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        [
                            'pincode' => $rowObj['pincode'],
                            'branch_id' => $rowObj['index'],
                        ]
                    ),
                    RequestType::CODE_201
                );
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
     */
    public function updatePincode(Request $request)
    {
        try
        {
            if(auth()->user()->can('branch-edit'))
            {
                $rowObj = $this->branchRepo->findById(auth()->user()->branch_id);
                $rowObj->pincode = $request->input('pincode');
                $rowObj->save();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        "Pincode successfully updated"
                    ),
                    RequestType::CODE_201
                );
            }
        }
        catch (Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function DashboardList()
    {
        try
        {
            $branches = $this->branchRepo->findByOrg(
                auth()->user()->organization_id,
                [ 'status' => '0' ],
                false
            );

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new BranchResourceCollection($branches, [ 'short' => true ])
                ), RequestType::CODE_200);

        }
        catch(Exception $e)
        {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

}
