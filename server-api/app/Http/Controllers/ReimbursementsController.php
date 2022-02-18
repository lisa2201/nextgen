<?php
namespace Kinderm8\Http\Controllers;
use DB;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Repositories\Reimbursements\IReimbursementsRepository;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Http\Resources\ReimbursementResourceCollection;

class ReimbursementsController extends Controller
{
    private $reimbursementRepo;

    private $snsService;

    public function __construct(IReimbursementsRepository $reimbursementRepo, SNSContract $SNSService)
    {
        $this->reimbursementRepo = $reimbursementRepo;
        $this->snsService = $SNSService;
    }


    public function get(Request $request)
    {
        $data = $this->reimbursementRepo->list([], $request);

        return (new ReimbursementResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $supplier = $this->reimbursementRepo->store($request);

            DB::commit();

            // reload with relations
            $supplier->load(['creator']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $supplier->index
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function update(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $supplier = $this->reimbursementRepo->update($request);

            DB::commit();

            // reload with relations
            $supplier->load(['creator']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $supplier->index
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $this->reimbursementRepo->delete(Helpers::decodeHashedID($request->input('id')));

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
