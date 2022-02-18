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
use Kinderm8\Repositories\Supplier\ISupplierRepository;
use Kinderm8\Repositories\Receipt\IReceiptRepository;
use Kinderm8\Repositories\Reimbursements\IReimbursementsRepository;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\Http\Resources\SupplierResourceCollection;

class SupplierController extends Controller
{

    private $supplierRepo;
    private $snsService;
    private $receiptRepo;
    private $reimbursementRepo;

    public function __construct(ISupplierRepository $supplierRepo, SNSContract $SNSService,IReceiptRepository $receiptRepo, IReimbursementsRepository $reimbursementRepo)
    {
        $this->supplierRepo = $supplierRepo;
        $this->snsService = $SNSService;
        $this->receiptRepo = $receiptRepo;
        $this->reimbursementRepo = $reimbursementRepo;
    }


    public function get(Request $request)
    {
        $data = $this->supplierRepo->list([], $request);

        return (new SupplierResourceCollection($data['list']))
            ->additional([
                'totalRecords' => $data['actual_count'],
                'filtered' => !is_null($data['filters']),
            ])
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function getAll(Request $request)
    {
        $data = $this->supplierRepo->get(['order'=> [
            'column' => 'name',
            'value'=>'asc'
        ]],['creator','branch'], $request, $request->input('withTrashed') === '1' ?  true: false);

        return (new SupplierResourceCollection($data))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {

            $supplier = $this->supplierRepo->store($request);

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

            $supplier = $this->supplierRepo->update($request);

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
            $this->supplierRepo->delete(Helpers::decodeHashedID($request->input('id')));

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

    public function getReportData(Request $request){


        $start_date = $request->input('start_date');
        $end_date =  $request->input('end_date');
        $is_pdf = $request->input('type') === 'PDF' ? true: false;

        $receipts = $this->receiptRepo->get(
            [
                'org' =>auth()->user()->organization_id,
                'branch' => auth()->user()->branch_id,
                // 'date' => [
                //     'start_date'=> $request->input('start_date'),
                //     'end_date'=> $request->input('end_date')
                // ],
                'order'=>[
                    'column' => 'date',
                    'value' => 'asc'
                ]
            ],
            ['creator','branch','supplier', 'category'],
            $request,
            false,
            false
        );

        $reimbursements  = $this->reimbursementRepo->get(
            [
                'org' =>auth()->user()->organization_id,
                'branch' => auth()->user()->branch_id,
                // 'date' => [
                //     'start_date'=> $request->input('start_date'),
                //     'end_date'=> $request->input('end_date')
                // ],
                'order'=>[
                    'column' => 'date',
                    'value' => 'asc'
                ]
            ],
            ['creator','branch', 'category'],
            $request,
            false,
            false
        );

        $receipts->map(function ($receipt) {
            $receipt['mode'] = 'debit';
            return $receipt;
        });
        $reimbursements->map(function ($reimbursement) {
            $reimbursement['mode'] = 'credit';
            return $reimbursement;
        });

        $report_data = [];

        // $merged= $reimbursements->union($receipts);

        $merged = array_merge($reimbursements->toArray(),$receipts->toArray());

        usort($merged, function($a, $b) {

            return strtotime($a['date']) - strtotime($b['date']);

            });


        // $sorted_array = array_values($sorted);
        $balance = 0;

        foreach($merged as  $key=>$data) {
            $value = null;
            $mode = $data['mode'];

            if($mode === 'credit'){
                $type = 'REIMBURSEMENT';
                $balance = $balance - floatval($data['total']);
            }
            else{
                $balance = $balance + floatval($data['total']);
                $type = 'RECEIPT';
            }
            $data_object = [
                'index_key'=>$key,
                'date' => $data['date'],
                'desc' => $data['note'] ? $data['note'] : 'N/A',
                'credit'=> $mode === 'credit' ? floatval($data['total']) : null,
                'debit'=> $mode === 'debit' ? floatval($data['total']) : null,
                'balance' => $balance,
                'data'=> $data,
                'type'=> $type,
                'index'=> $data['index'],
                'opening_balance' => false,
                'cost'=> $mode === 'debit' ? floatval($data['cost']) : null,
                'gst'=> $mode === 'debit' ? floatval($data['gst']) : null,
                'gst_amount'=> $mode === 'debit' ? floatval($data['gst_amount']) : null,
            ];
            $id = $key;
            array_push($report_data, $data_object);
        }

        // \Log::info($report_data);

        $filter_data = $this->filterData($report_data, $start_date, $end_date);
        $category_group = [];
        $opening_balance = 0;

            if (count($filter_data) > 0) {

                $index = $filter_data[0]['index_key'];
                if ($index === 0) {
                    $opening_balance = 0;
                    $opening_array = [
                        'id'=>$filter_data[0]['index_key'],
                        'date' => $filter_data[0]['date'],
                        'desc' => 'opening_balance',
                        'balance' =>$opening_balance,
                        'opening_balance' => true
                    ];
                } else {

                    $opening_balance = $report_data[$index-1]['balance'];
                    $opening_array = [
                        'id'=>$report_data[$index-1]['index_key'],
                        'date' => $report_data[$index-1]['date'],
                        'desc' => 'opening_balance',
                        'balance' =>$opening_balance,
                        'opening_balance' => true
                    ];
                }
                array_unshift($filter_data, $opening_array);
            }

            // \Log::info($filter_data);

            // get data group by category
            if($is_pdf){

                $group_by_category = $this->receiptRepo->get(
                    [
                        'org' =>auth()->user()->organization_id,
                        'branch' => auth()->user()->branch_id,
                        'order'=>[
                            'column' => 'date',
                            'value' => 'asc'
                        ],
                        'date' => [
                        'start_date'=> $request->input('start_date'),
                        'end_date'=> $request->input('end_date')
                        ],
                    ],
                    ['supplier', 'category'],
                    $request,
                    false,
                    false
                )->groupBy('category_id')->toArray();

                foreach($group_by_category as $key=>$category_data){

                    $group_array = [];
                    $group_array_master = [];

                    foreach($category_data as $key=> $receipt_data){

                        $group = [
                            'id'=>$receipt_data['index'],
                            'date'=>$receipt_data['date'],
                            'desc'=>$receipt_data['note'] ? $receipt_data['note'] : 'N/A',
                            'supplier'=>$receipt_data['supplier']['name'],
                            'total'=> floatval($receipt_data['total']),
                            'gst'=>$receipt_data['gst'],
                            'gst_amount'=>  floatval(floatval($receipt_data['total']) - floatval($receipt_data['cost'])),
                            'cost'=>floatval($receipt_data['cost'])
                        ];

                        array_push($group_array, $group);

                    }

                    $group_array_master = [
                        'category'=> $category_data[0]['category'],
                        'receipt_data'=>$group_array
                    ];

                    array_push($category_group, $group_array_master);

                }

            }

            $data = [
                'list' => $filter_data,
                'category_data'=> $category_group
            ];


            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $data
                ),
                RequestType::CODE_200
            );


    }

    private function filterData(array $transaction, $start_date, $end_date) {

        $filterd = [];
        if(!Helpers::IsNullOrEmpty($start_date) && !Helpers::IsNullOrEmpty($end_date)){
            foreach ($transaction as $item){

                if ($item['date'] >= $start_date  &&$item['date'] <= $end_date) {

                    array_push($filterd, $item);
                }

            }


        }
        else{

            if(count($transaction) > 19){
                $filterd = array_slice($transaction, -20);
            }
            else{
            $filterd = $transaction;
            }
        }

        return $filterd;

    }

}
