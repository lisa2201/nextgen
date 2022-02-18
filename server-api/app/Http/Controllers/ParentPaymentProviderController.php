<?php

namespace Kinderm8\Http\Controllers;

use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Requests\ParentPaymentProviderDeleteRequest;
use Kinderm8\Http\Requests\ParentPaymentProviderStoreRequest;
use Kinderm8\Http\Requests\ParentPaymentProviderUpdateRequest;
use Kinderm8\Http\Requests\ParentPaymentProviderValidateRequest;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Http\Resources\ParentPaymentProviderResourceCollection;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\ParentPaymentProvider\IParentPaymentProviderRepository;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;
use RequestHelper;

class ParentPaymentProviderController extends Controller
{

    use UserAccessibility;
    
    private $paymentProviderRepo;
    private $branchRepo;

    public function __construct(IParentPaymentProviderRepository $paymentProviderRepo, IBranchRepository $branchRepo)
    {
        $this->paymentProviderRepo = $paymentProviderRepo;
        $this->branchRepo = $branchRepo;
    }

    public function list(Request $request)
    {

        try {

            $provider_list = $this->paymentProviderRepo->list($request, []);

            return (new ParentPaymentProviderResourceCollection($provider_list['list']))
                ->additional([
                    'totalRecords' => $provider_list['totalRecords'],
                    'filtered' => $provider_list['filtered'],
                    'providerFull' => $provider_list['providerFull']
                ])
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {
            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function store(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(ParentPaymentProviderStoreRequest::class);

            $payment_provider = $this->paymentProviderRepo->store($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function update(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(ParentPaymentProviderUpdateRequest::class);

            $payment_provider = $this->paymentProviderRepo->update($request);

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function delete(Request $request)
    {

        DB::beginTransaction();

        try {

            // validation
            app(ParentPaymentProviderDeleteRequest::class);

            $this->paymentProviderRepo->delete(Helpers::decodeHashedID($request->input('provider_id')));

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_delete')
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {
            DB::rollBack();

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    public function getBranchList(Request $request)
    {

        try {

            $ignore_list = $this->paymentProviderRepo->query();
            $ignore_list = $this->attachAccessibilityQuery($ignore_list);
            $ignore_list = $ignore_list->pluck('branch_id');

            $branches = $this->branchRepo->query();
            $branches = $this->attachAccessibilityQuery($branches);
            $branches = $branches->whereNotIn('id', $ignore_list)->get();

            return (new BranchResourceCollection($branches, ['basic' => true]))
                ->response()
                ->setStatusCode(RequestType::CODE_200);

        } catch (Exception $e) {

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }
    }

    public function validateKeys(Request $request)
    {

        try {

            // validation
            app(ParentPaymentProviderValidateRequest::class);

            $collection = collect([]);

            $configs = $request->input('configuration');
            
            foreach ($configs as $config)
            {
                if (array_key_exists('value', $config)) {
                    $items = $this->paymentProviderRepo->get(['key' => $config['value']], ['branch'], $request, false);
                    $collection = $collection->merge($items);
                }
            }

            $collection = $collection->unique();

            if (!Helpers::IsNullOrEmpty($request->input('provider_id'))) {
                
                $collection = $collection->filter(function($val) use($request) {
                    return $val->id != Helpers::decodeHashedID($request->input('provider_id'));
                });

            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    new ParentPaymentProviderResourceCollection($collection, [])
                ),
                RequestType::CODE_200
            );

        } catch (Exception $e) {

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);

        }

    }

}
