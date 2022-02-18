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
use Kinderm8\Repositories\Category\ICategoryRepository;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Http\Resources\CategoryResourceCollection;

class CategoryController extends Controller
{


    private $catergoryRepo;

    private $snsService;

    public function __construct(ICategoryRepository $catergoryRepo, SNSContract $SNSService)
    {
        $this->catergoryRepo = $catergoryRepo;
        $this->snsService = $SNSService;
    }

    public function get(Request $request)
    {
        $data = $this->catergoryRepo->list([], $request);

        return (new CategoryResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getAll(Request $request)
    {
        $data = $this->catergoryRepo->get(
            [
                'type'=>$request->input('type'),
                'order'=> [
                    'column' => 'name',
                    'value'=>'asc'
                ]
            ],['creator','branch'], $request, $request->input('withTrashed') === '1' ?  true: false);

        return (new CategoryResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $category = $this->catergoryRepo->store($request);

            DB::commit();

            // reload with relations
            $category->load(['creator']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $category->index
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

            $category = $this->catergoryRepo->update($request);

            DB::commit();

            // reload with relations
            $category->load(['creator']);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    $category->index
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
            $this->catergoryRepo->delete(Helpers::decodeHashedID($request->input('id')));

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
