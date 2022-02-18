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
use Kinderm8\Repositories\Receipt\IReceiptRepository;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Http\Resources\ReceiptResourceCollection;

class ReceiptController extends Controller
{
    private $receiptRepo;

    private $snsService;

    public function __construct(IReceiptRepository $receiptRepo, SNSContract $SNSService)
    {
        $this->receiptRepo = $receiptRepo;
        $this->snsService = $SNSService;
    }


    public function get(Request $request)
    {
        $data = $this->receiptRepo->list([], $request);

        return (new ReceiptResourceCollection($data['list']))
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

            $receipt = $this->receiptRepo->store($request);

            DB::commit();

            // reload with relations
            $receipt->load(['creator','supplier', 'category']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $receipt->index
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

            $receipt = $this->receiptRepo->update($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $receipt->index
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
            $this->receiptRepo->delete(Helpers::decodeHashedID($request->input('id')));

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

    public function script(Request $request){
        DB::beginTransaction();

        try
        {

            $receipt = $this->receiptRepo->script($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $receipt
                ), RequestType::CODE_201);
        }
        catch(Exception $e)
        {
            DB::rollBack();
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
