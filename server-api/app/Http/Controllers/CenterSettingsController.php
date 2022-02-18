<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
use Cache;
use CacheHelper;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Kinderm8\Branch;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use Kinderm8\Http\Resources\ChildResourceCollection;
use Kinderm8\Repositories\Branch\BranchRepository;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Room;
use Kinderm8\RoomCapacity;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\User;
use Kinderm8\Http\Resources\RoomResource;
use Kinderm8\Http\Resources\BranchResource;
use Kinderm8\Http\Resources\RoomResourceCollection;
use LocalizationHelper;
use RequestHelper;

class CenterSettingsController extends Controller
{
    private $branchRepo;
    private $snsService;

    public function __construct(IBranchRepository $branchRepo, SNSContract $snsService)
    {
        $this->branchRepo = $branchRepo;
        $this->snsService = $snsService;
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function storeBusinessInfo(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // get branch
            $branch = $this->branchRepo->findById(Helpers::decodeHashedID($request->input('branch_id')));

            // check if center ratio values exist
            $center_ratio = $state = $kindergarten_attendance = $preschool_program = null;

            if(array_key_exists('center_ratio', $branch->center_settings))
                $center_ratio = $branch->center_settings['center_ratio'];

            if(array_key_exists('state', $branch->center_settings))
                $state = $branch->center_settings['state'];

            if(array_key_exists('kindergarten_attendance', $branch->center_settings))
                $kindergarten_attendance = $branch->center_settings['kindergarten_attendance'];

            if(array_key_exists('preschool_program', $branch->center_settings))
                $preschool_program = $branch->center_settings['preschool_program'];

            $center_settings = [
                'business_name' => $request->input('business_name'),
                'business_description' => $request->input('business_description'),
                'address' => $request->input('address'),
                'email' => $request->input('email'),
                'phone' => $request->input('phone'),
                'fax' => $request->input('fax'),
                'zip_code' => $request->input('zip_code'),
                'date_format' => !Helpers::IsNullOrEmpty($request->input('date_format')) ? $request->input('date_format') : 'YYYY-MM-DD',
                'time_format' => !Helpers::IsNullOrEmpty($request->input('time_format')) ? $request->input('time_format') : 'hh:mm:ss A',
                'center_ratio' => $center_ratio,
                'state' => $state
            ];

            $center_settings['kindergarten_attendance'] = $kindergarten_attendance;
            $center_settings['preschool_program'] = $preschool_program;

            $branch->center_settings = $center_settings;

            $branch->update();

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new BranchResource($branch, [ 'basic' => true ])
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * @param Request $request
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function storeBusinessLogo(Request $request)
    {
        DB::beginTransaction();

        try
        {
            // get branch
            $branch = $this->branchRepo->findById(Helpers::decodeHashedID($request->input('branch_id')));

            $logoFileInput = $request->input('upload_file');

            if(!empty($logoFileInput['businessLogo']))
            {
                \Log::info('set logo to ');
                \Log::info($logoFileInput['businessLogo'][array_key_last($logoFileInput['businessLogo'])]);
                $branch->branch_logo = $logoFileInput['businessLogo'][array_key_last($logoFileInput['businessLogo'])];
            }
            else
            {
                \Log::info('its empty set it to null');
                $branch->branch_logo = null;
            }

            $branch->save();


        }
        catch(Exception $e)
        {
            DB::rollBack();

            throw new ServerErrorException($e->getMessage(), $e->getCode(), $e);
        }
        DB::commit();
        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_update')
            ), RequestType::CODE_200);
    }

    /**
     * @return JsonResponse
     * @throws ServerErrorException
     */
    public function deviceCcsTypes()
    {
        try
        {
            $response['abs_reason'] = CCSType::BOOKING_ABSENCE_REASON;

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
