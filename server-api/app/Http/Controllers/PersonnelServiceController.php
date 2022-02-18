<?php

namespace Kinderm8\Http\Controllers;

use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Enums\RoleType;
use Kinderm8\Http\Controllers\Controller;
use Log;
use RequestHelper;
use LocalizationHelper;
use Kinderm8\ProviderSetup;
use DB;
use ErrorHandler;
use Illuminate\Support\Facades\Storage;
use Helpers;
use Carbon\Carbon;
use Aws\Sns\SnsClient;
use Kinderm8\ServiceSetup;
use Kinderm8\PersonnelService;
use Kinderm8\Http\Resources\PersonnelServiceResourceCollection;
use Kinderm8\Http\Resources\PersonnelServiceResource;
use Kinderm8\Branch;
use Kinderm8\Http\Resources\BranchResourceCollection;
use Kinderm8\Http\Resources\OrganizationResource;
use Kinderm8\Http\Resources\OrganizationResourceCollection;
use Kinderm8\Http\Resources\RoleResourceCollection;
use Kinderm8\Http\Resources\UserResource;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Organization;
use Kinderm8\Role;
use Kinderm8\User;
use DBHelper;
use Kinderm8\Services\AWS\SNSContract;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Repositories\CCSSetup\ICCSSetupRepository;
use Exception;
use Kinderm8\Traits\UserAccessibility;

class PersonnelServiceController extends Controller
{

    use UserAccessibility;

    private $snsService;
    private $ccsSetupRepo;

    public function __construct(SNSContract $snsService, ICCSSetupRepository $ccsSetupRepo)
    {
        $this->snsService = $snsService;
        $this->ccsSetupRepo = $ccsSetupRepo;
    }

    public function getPersonnelList(Request $request)
    {

        try {

            $personnel = PersonnelService::query();

            $personnel = $this->attachAccessibilityQuery($personnel);

            $personnel = $personnel->with(['service.provider.ccsSetup'])->get();

            return (new PersonnelServiceResourceCollection($personnel))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        } catch (Exception $e) {

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }

    public function getFile(Request $request)
    {
        try {
            // Log::info('this work');

            $input = $request->all();
            $file = $request->file('file');

            // Log::info($input);


        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function create(Request $request)
    {
        DB::beginTransaction();
        try {

            $service_setup_id = Helpers::decodeHashedID($request->input('service_setup_id'));

            $personnelService = new PersonnelService();
            $personnelService->user_id = Helpers::decodeHashedID($request->input('assignUser'));
            $personnelService->organization_id = auth()->user()->organization_id;
            $personnelService->service_setup_id = $service_setup_id;
            $personnelService->provider_id = $request->input('provider');
            $personnelService->service_id = $request->input('service');
            $personnelService->first_name = $request->input('fName');
            $personnelService->last_name = $request->input('lName');
            $personnelService->phone = $request->input('phone');
            $personnelService->email = $request->input('email');
            $personnelService->branch_id = Helpers::decodeHashedID($request->input('branch')); //Helpers::decodeHashedID($request->input('branch')? $request->input('branch') : 1);

            $personnelService->indentification =  $request->input('identy');
            $personnelService->proda_id = $request->input('prodaId') ? $request->input('prodaId') : $request->input('personId');
            $personnelService->dob = $request->input('dob');


            $personnelService->personnel_declaration = json_encode($request->input('declaration'));
            $personnelService->roles =  json_encode($request->input('roles'));
            $personnelService->wwcc =  json_encode($request->input('wwcc'));
            // $personnelService->supporting_documents = json_encode($selectedItem);

            $personnelService->supporting_documents = json_encode($request->input('supportingDocInput')); //'1';
            $personnelService->save();
            $personnelService->refresh();

            $ccsOrg = $this->ccsSetupRepo->findByService($service_setup_id, []);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.NextCCS_Create_Service_Personnel', AWSConfigType::SNS),
                [
                    "organization" => $personnelService->organization_id,
                    "subjectid" => $personnelService->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "action" => "Service personnel created"
                ],
                'Service personnel created'
            );
            DB::commit();
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    new PersonnelServiceResource($personnelService)
                ), RequestType::CODE_201);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }


    public function update(Request $request)
    {
        DB::beginTransaction();
        try {


            $id = Helpers::decodeHashedID($request->input('id'));

            $personnelService = PersonnelService::find($id);

            if (is_null($personnelService))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }
            else
            {

                $is_synced = $personnelService->is_synced;

                $personnelService->user_id = Helpers::decodeHashedID($request->input('assignUser'));
                $personnelService->organization_id = auth()->user()->organization_id;
                $personnelService->provider_id = $request->input('provider');
                $personnelService->service_id = $request->input('service');
                $personnelService->first_name = $request->input('fName');
                $personnelService->last_name = $request->input('lName');
                $personnelService->phone = $request->input('phone');
                $personnelService->email = $request->input('email');
                $personnelService->branch_id = Helpers::decodeHashedID($request->input('branch'));

                $personnelService->indentification =  $request->input('identy');
                $personnelService->proda_id = $request->input('prodaId') ? $request->input('prodaId') : $request->input('personId');
                $personnelService->dob = $request->input('dob');


                $personnelService->personnel_declaration = json_encode($request->input('declaration'));
                $personnelService->roles =  json_encode($request->input('roles'));
                $personnelService->wwcc =  json_encode($request->input('wwcc'));
                $personnelService->supporting_documents = json_encode($request->input('supportingDocInput')); // json_encode($selectedItem); //json_encode($request->input('supportingDocInput')); //'1';
                $personnelService->save();
                $personnelService->refresh();

                $ccsOrg = $this->ccsSetupRepo->findByService($personnelService->service_setup_id, []);

                Log::info($is_synced);
                if($is_synced === '2') {

                    // $sns = new SnsClient([
                    //     'region' => config('aws.region'),
                    //     'version' => "2010-03-31"
                    // ]);

                    // $message = json_encode([
                    //     "organization" => $personnelService->organization_id,
                    //     "subjectid" => $personnelService->id,
                    //     "authpersonid" => $ccsOrg->person_id,
                    //     "action" => "Service personnel created"
                    // ]);

                    // $result = $sns->publish([
                    //     'Message' => $message,
                    //     'TopicArn' => config('aws.sns.account_management.NextCCS_Create_Service_Personnel'),
                    //     'Subject' => 'Service personnel created'
                    // ]);

                    $this->snsService->publishEvent(
                        Helpers::getConfig('account_management.NextCCS_Create_Service_Personnel', AWSConfigType::SNS),
                        [
                            "organization" => $personnelService->organization_id,
                            "subjectid" => $personnelService->id,
                            "authpersonid" => $ccsOrg->person_id,
                            "action" => "Service personnel created"
                        ],
                        'Service personnel created'
                    );

                }
                else
                {

                    // $sns = new SnsClient([
                    //     'region' => config('aws.region'),
                    //     'version' => "2010-03-31"
                    // ]);

                    // $message = json_encode([
                    //     "organization" => $personnelService->organization_id,
                    //     "subjectid" => $personnelService->id,
                    //     "authpersonid" => $ccsOrg->person_id,
                    //     "action" => "Service personnel updated"
                    // ]);

                    // $result = $sns->publish([
                    //     'Message' => $message,
                    //     'TopicArn' => config('aws.sns.account_management.NextCCS_Update_Service_Personnel'),
                    //     'Subject' => 'Service personnel updated'
                    // ]);

                    $this->snsService->publishEvent(
                        Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                        [
                            "organization" => $personnelService->organization_id,
                            "subjectid" => $personnelService->id,
                            "authpersonid" => $ccsOrg->person_id,
                            "action" => "Service personnel updated"
                        ],
                        'Service personnel updated'
                    );
                }


            }

            DB::commit();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_update'),
                    new PersonnelServiceResource($personnelService)
                ), RequestType::CODE_201);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }
    public function getPersonnelInfo(Request $request)
    {

        try
        {
            $id = Helpers::decodeHashedID($request->input('index'));

            $rowObj = PersonnelService::find($id);

            // Log::info($rowObj);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }

            return response()->json(
                        RequestHelper::sendResponse(
                            RequestType::CODE_200,
                            LocalizationHelper::getTranslatedText('response.success_request'),
                            new PersonnelServiceResource($rowObj)
                        ), RequestType::CODE_200);

            if($rowObj->is_synced !== '1') {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_200,
                        LocalizationHelper::getTranslatedText('response.success_request'),
                        new PersonnelServiceResource($rowObj)
                    ), RequestType::CODE_200);
            }

            else
            {

                $auth_person_id = '0110460024';

                $client = new \GuzzleHttp\Client();
                $urlConfig =  config('aws.end_points.account_management.get_personnel_from_api');

                $url = $urlConfig.$rowObj->provider_id.'';

                $ccsOrg = $this->ccsSetupRepo->findByService($rowObj->service_setup_id, []);

                $res = $client->request('GET', $url, [
                    'headers' => [
                        'x-api-key' => 'MM689g84EXaZZex7JH7mO6YbQPCCE4K11WOtV4tj',
                        'authpersonid' => $ccsOrg->person_id
                    ]
                ]);

                $body = $res->getBody()->getContents();

                $resp_data = json_decode($body, true);

                if(count($resp_data['results']) > 0) {

                    return (new PersonnelServiceResource($rowObj))
                        ->additional([
                        'apiData' => $resp_data,
                        ])
                        ->response()
                    ->setStatusCode(RequestType::CODE_200);

                }

            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function updateDeclaration(Request $request)
    {
        DB::beginTransaction();
        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));


            $rowObj = PersonnelService::find($id);

            // Log::info($rowObj);

            if (is_null($rowObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }
            else
            {

                $rowObj->personnel_declaration = json_encode($request->input('declaration'));
                $rowObj->is_synced = '0';
                $rowObj->save();

                $ccsOrg = $this->ccsSetupRepo->findByService($rowObj->service_setup_id, []);

                // $sns = new SnsClient([
                //     'region' => config('aws.region'),
                //     'version' => "2010-03-31"
                // ]);

                // $message = json_encode([
                //     "organization" => $rowObj->organization_id,
                //     "subjectid" => $rowObj->id,
                //     "authpersonid" => $ccsOrg->person_id,
                //     "action" => "Service personnel updated"
                // ]);

                // $result = $sns->publish([
                //     'Message' => $message,
                //     'TopicArn' => config('aws.sns.account_management.NextCCS_Update_Service_Personnel'),
                //     'Subject' => 'Service personnel updated'
                // ]);

                $this->snsService->publishEvent(
                    Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                    [
                        "organization" => $rowObj->organization_id,
                        "subjectid" => $rowObj->id,
                        "authpersonid" => $ccsOrg->person_id,
                        "action" => "Service personnel updated"
                    ],
                    'Service personnel updated'
                );
                DB::commit();
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_create'),
                        new PersonnelServiceResource($rowObj)
                    ), RequestType::CODE_201);

            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function editContact(Request $request)
    {
        DB::beginTransaction();
        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));


            $personnelService = PersonnelService::find($id);

            if (is_null($personnelService))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }
            else
            {
                $is_synced = $personnelService->is_synced;

                $personnelService->phone = $request->input('phone') ? $request->input('phone') : '';
                $personnelService->is_synced = '0';
                $personnelService->save();

                $ccsOrg = $this->ccsSetupRepo->findByService($personnelService->service_setup_id, []);

                Log::info($is_synced);

                if($is_synced === '2') {

                    // $sns = new SnsClient([
                    //     'region' => config('aws.region'),
                    //     'version' => "2010-03-31"
                    // ]);

                    // $message = json_encode([
                    //     "organization" => $personnelService->organization_id,
                    //     "subjectid" => $personnelService->id,
                    //     "authpersonid" => $ccsOrg->person_id,
                    //     "action" => "Service personnel created"
                    // ]);

                    // $result = $sns->publish([
                    //     'Message' => $message,
                    //     'TopicArn' => config('aws.sns.account_management.NextCCS_Create_Service_Personnel'),
                    //     'Subject' => 'Service personnel created'
                    // ]);

                    $this->snsService->publishEvent(
                        Helpers::getConfig('account_management.NextCCS_Create_Service_Personnel', AWSConfigType::SNS),
                        [
                            "organization" => $personnelService->organization_id,
                        "subjectid" => $personnelService->id,
                        "authpersonid" => $ccsOrg->person_id,
                        "action" => "Service personnel created"
                        ],
                        'Service personnel created'
                    );

                }

                else{

                    // $sns = new SnsClient([
                    //     'region' => config('aws.region'),
                    //     'version' => "2010-03-31"
                    // ]);

                    // $message = json_encode([
                    //     "type" => 'UPDATE_CONTACT_PROVIDER',
                    //     "organization" => $personnelService->organization_id,
                    //     "subjectid" => $personnelService->id,
                    //     "authpersonid" => $ccsOrg->person_id,
                    //     "data" => $request->input('phone'),
                    //     "action" => "Service personnel updated"
                    // ]);

                    // $result = $sns->publish([
                    //     'Message' => $message,
                    //     'TopicArn' => config('aws.sns.account_management.NextCCS_Update_Service_Personnel'),
                    //     'Subject' => 'Service personnel updated'
                    // ]);

                    $this->snsService->publishEvent(
                        Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                        [
                            "type" => 'UPDATE_CONTACT_PROVIDER',
                            "organization" => $personnelService->organization_id,
                            "subjectid" => $personnelService->id,
                            "authpersonid" => $ccsOrg->person_id,
                            "data" => $request->input('phone'),
                            "action" => "Service personnel updated"
                        ],
                        "Service personnel updated"
                    );

                }
                DB::commit();
                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_create'),
                        new PersonnelServiceResource($personnelService)
                    ), RequestType::CODE_201);

            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }


    public function getUser(Request $request)
    {

        try
        {
            //pagination
            $offset = (! Helpers::IsNullOrEmpty($request->input('offset'))) ? (int) $request->input('offset') : 5;

            //search
            $searchValue = (! Helpers::IsNullOrEmpty($request->input('search'))) ? Helpers::sanitizeInputString($request->input('search'), true) : null;

            //sort
            $sortOption = (! Helpers::IsNullOrEmpty($request->input('sort')) && is_null($searchValue)) ? json_decode($request->input('sort')) : null;

            //filters
            $filters = (! Helpers::IsNullOrEmpty($request->input('filters'))) ? json_decode($request->input('filters')) : null;

            //query builder
            // $user_list = User::with(['organization', 'branch', 'roles'])
            //     ->leftjoin('km8_organization_branch', 'km8_organization_branch.id', '=', 'km8_users.branch_id')
            //     ->join('km8_model_has_roles', 'km8_model_has_roles.model_id', '=', 'km8_users.id')
            //     ->join('km8_roles', 'km8_model_has_roles.role_id', '=', 'km8_roles.id');
            $user_list = User::with(['roles', 'branch'])->where('organization_id', '=', auth()->user()->organization_id)
                                ->whereHas('roles', function($query){
                                    $query->where('type', 'NOT ILIKE', '%'. RoleType::PARENTSPORTAL .'%');
                                });

            //remove current user
            // $user_list->where('km8_users.email', '<>', auth()->user()->email);

            //
            // if(auth()->user()->isRoot())
            // {

            // }
            // else if(auth()->user()->isOwner() || auth()->user()->hasSiteManagerAccess())
            // {
            //     $user_list->where('km8_users.organization_id', '=', auth()->user()->organization_id);
            // }
            // else
            // {
            //     $user_list
            //         ->where('km8_users.organization_id', '=', auth()->user()->organization->id)
            //         ->where('km8_users.branch_id', '=', auth()->user()->branch->id);

            //     $viewParent = (! Helpers::IsNullOrEmpty($request->input('view-parent')))
            //         ? (($request->input('view-parent') === '1') ? RoleType::PARENTSPORTAL : RoleType::ADMINPORTAL)
            //         : null;

            //     if(!is_null($viewParent))
            //     {
            //         $user_list->where('km8_roles.type', 'ILIKE', '%'. $viewParent .'%');
            //     }
            // }

            //get actual count
            // $actualCount = $user_list
            //     ->select(['km8_users.*', 'km8_organization_branch.name', 'km8_roles.type'])
            //     ->groupBy('km8_users.id', 'km8_roles.type', 'km8_organization_branch.name')
            //     ->get()
            //     ->count();

            //filters
            // if(!is_null($filters))
            // {
            //     if(isset($filters->status) && $filters->status !== '0')
            //     {
            //         $user_list->where('km8_users.status', '=', $filters->status === '1' ? '0' : '1');
            //     }

            //     if(isset($filters->has_access) && $filters->has_access !== '0')
            //     {
            //         $user_list->where('km8_users.login_access', '=', $filters->has_access === '1' ? '0' : '1');
            //     }

            //     if(isset($filters->level) && $filters->level !== '0')
            //     {
            //         $user_list->where('km8_roles.type', 'ILIKE', '%'.$filters->level.'%');
            //     }

            //     if(isset($filters->branch) && !is_null($filters->branch))
            //     {
            //         $user_list->where('km8_users.branch_id', Helpers::decodeHashedID($filters->branch));
            //     }
            // }

            //search
            // if(!is_null($searchValue))
            // {
            //     $searchList = [];

            //     if(auth()->user()->isRoot())
            //     {

            //     }
            //     else if(auth()->user()->isOwner() || auth()->user()->hasSiteManagerAccess())
            //     {
            //         $searchList = [
            //             'km8_users.first_name',
            //             'km8_users.last_name',
            //             'km8_users.email',
            //             'km8_organization_branch.name'
            //         ];
            //     }
            //     else
            //     {
            //         $searchList = [
            //             'km8_users.first_name',
            //             'km8_users.last_name',
            //             'km8_users.email',
            //         ];
            //     }

            //     if(!empty($searchList))
            //     {
            //         $user_list->whereLike($searchList, $searchValue);
            //     }
            // }

            //sorting
            // if(!is_null($sortOption) && (isset($sortOption->value) && !is_null($sortOption->value)))
            // {
            //     $user_list->orderBy(
            //         Arr::get($this->sortColumnsMap, $sortOption->key),
            //         Arr::get(DBHelper::TABLE_SORT_VALUE_MAP, $sortOption->value)
            //     );
            // }
            // else
            // {
            //     $user_list->orderBy('km8_users.id', array_values(DBHelper::TABLE_SORT_VALUE_MAP)[1]);
            // }

            $user_list = $user_list->get();
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            $user_list = [];
        }

        return (new UserResourceCollection($user_list))
            ->response()
            ->setStatusCode(RequestType::CODE_200);

    }

    public function addNewData(Request $request)
    {

        DB::beginTransaction();
        try
        {

            $id = Helpers::decodeHashedID($request->input('id'));
            $type = $request->input('type');
            $personnelService = PersonnelService::find($id);

            if (is_null($personnelService))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('system.resource_not_found')
                ), RequestType::CODE_404);
            }


            else{

                if($type === 'NEW_ROLE') {
                    $inputData = $request->input('roles');
                    $this->addRole($personnelService,$inputData);
                }
                else if($type === 'NEW_DOC') {
                    $inputData = $request->input('supportingDocInput');
                    $this->addDoc($personnelService,$inputData);
                }

                else if($type === 'NEW_WWCC') {
                    $inputData = $request->input('wwcc');
                    $this->addWWCC($personnelService,$inputData);
                }

                DB::commit();

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_201,
                        LocalizationHelper::getTranslatedText('response.success_update'),
                        new personnelServiceResource($personnelService)
                    ), RequestType::CODE_201);

            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
            DB::rollBack();
            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function addRole($personnelService,$inputData)
    {
        DB::beginTransaction();
        try
        {
            $serviceRole = json_decode($personnelService->roles, true);

            array_push($serviceRole, [
                'action' => $inputData[0]['action'],
                'type' => $inputData[0]['type'],
                'position' => $inputData[0]['position'],
                'startDate' => $inputData[0]['startDate'],
            ]);

            $personnelService->roles =  json_encode($serviceRole,true);
            $personnelService->is_synced = '0';
            $personnelService->save();

            $ccsOrg = $this->ccsSetupRepo->findByService($personnelService->service_setup_id, []);

            // $sns = new SnsClient([
            //     'region' => config('aws.region'),
            //     'version' => "2010-03-31"
            // ]);

            // $message = json_encode([
            //     "type" => 'NEW_ROLE_SERVICE',
            //     "organization" => $personnelService->organization_id,
            //     "subjectid" => $personnelService->id,
            //     "authpersonid" => $ccsOrg->person_id,
            //     "data" => $inputData,
            //     "action" => "Service personnel role added"
            //     ]);

            //     $result = $sns->publish([
            //         'Message' => $message,
            //         'TopicArn' => config('aws.sns.account_management.NextCCS_Update_Service_Personnel'),
            //         'Subject' => 'Service personnel role added'
            //     ]);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                [
                "type" => 'NEW_ROLE_SERVICE',
                "organization" => $personnelService->organization_id,
                "subjectid" => $personnelService->id,
                "authpersonid" => $ccsOrg->person_id,
                "data" => $inputData,
                "action" => "Service personnel role added"
                ],
                "Service personnel role added"
            );

            DB::commit();

        }
        catch (Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function addDoc($personnelService,$inputData)
    {

        DB::beginTransaction();
        try
        {
            $serviceDoc  = [];

            $serviceDoc = json_decode($personnelService->supporting_documents, true);
            $sendingTypeToSNS = [];
            foreach($inputData as $docData){

                Log::info($serviceDoc);
                $index = array_search($docData['documentType'], array_column($serviceDoc, 'documentType'));
                Log::info($index);
                if (isset($serviceDoc[$index])){
                    Log::info('doc found');
                    $updated_addr = [
                        'documentType' => $docData['documentType'],
                        'fileName' => $docData['fileName'],
                        'MIMEType' => $docData['MIMEType'],
                        'fileContent' => $docData['fileContent'],
                    ];

                    $serviceDoc[$index] = $updated_addr;
                }
                else {

                    array_push($serviceDoc, [
                        'documentType' => $docData['documentType'],
                        'fileName' => $docData['fileName'],
                        'MIMEType' => $docData['MIMEType'],
                        'fileContent' => $docData['fileContent'],
                    ]);
                }

                array_push($sendingTypeToSNS, [
                    'documentType' => $docData['documentType'],
                ]);


            }
            Log::info($sendingTypeToSNS);
            // Log::info($providerDoc);
            $personnelService->supporting_documents = json_encode($serviceDoc);
            $personnelService->is_synced = '0';
            $personnelService->save();

            $ccsOrg = $this->ccsSetupRepo->findByService($personnelService->service_setup_id, []);

            // $sns = new SnsClient([
            //     'region' => config('aws.region'),
            //     'version' => "2010-03-31"
            // ]);

            // $message = json_encode([
            //     "type" => 'NEW_DOC_SERVICE',
            //     "organization" => $personnelService->organization_id,
            //     "subjectid" => $personnelService->id,
            //     "authpersonid" => $ccsOrg->person_id,
            //     "data" => $sendingTypeToSNS,
            //     "action" => "Service personnel doc added"
            //     ]);

            //     $result = $sns->publish([
            //         'Message' => $message,
            //         'TopicArn' => config('aws.sns.account_management.NextCCS_Update_Service_Personnel'),
            //         'Subject' => 'Service personnel doc added'
            //     ]);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                [
                    "type" => 'NEW_DOC_SERVICE',
                    "organization" => $personnelService->organization_id,
                    "subjectid" => $personnelService->id,
                    "authpersonid" => $ccsOrg->person_id,
                    "data" => $sendingTypeToSNS,
                    "action" => "Service personnel doc added"
                ],
                "Service personnel doc added"
            );

            DB::commit();
        }
        catch (Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function addWWCC($personnelService,$inputData)
    {

        DB::beginTransaction();
        try
        {

            $serviceWWCC = json_decode($personnelService->wwcc, true);

            array_push($serviceWWCC, [
                'action' => $inputData[0]['action'],
                'cardNumber' => $inputData[0]['cardNumber'],
                'expiryDate' => $inputData[0]['expiryDate'],
                'issuingState' => $inputData[0]['issuingState'],
            ]);


            $personnelService->wwcc = json_encode($serviceWWCC);
            $personnelService->is_synced = '0';
            $personnelService->save();

            $ccsOrg = $this->ccsSetupRepo->findByService($personnelService->service_setup_id, []);

            // $sns = new SnsClient([
            //     'region' => 'ap-southeast-2',
            //     'version' => "2010-03-31"
            // ]);

            // $message = json_encode([
            //     "type" => 'NEW_WWCC_SERVICE',
            //     "organization" => $personnelService->organization_id,
            //     "subjectid" => $personnelService->id,
            //     "authpersonid" => $ccsOrg->person_id,
            //     "data" => $inputData,
            //     "action" => "Service personnel wwcc added"
            //     ]);

            //     $result = $sns->publish([
            //         'Message' => $message,
            //         'TopicArn' => 'arn:aws:sns:ap-southeast-2:727928824050:NextCCS_Update_Service_Personnel',
            //         'Subject' => 'Service personnel wwcc added'
            //     ]);

            $this->snsService->publishEvent(
                Helpers::getConfig('account_management.NextCCS_Update_Service_Personnel', AWSConfigType::SNS),
                [
                "type" => 'NEW_WWCC_SERVICE',
                "organization" => $personnelService->organization_id,
                "subjectid" => $personnelService->id,
                "authpersonid" => $ccsOrg->person_id,
                "data" => $inputData,
                "action" => "Service personnel wwcc added"
                ],
                "Service personnel wwcc added"
            );
            DB::commit();

        }
        catch (Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }

    }

    public function getAuthPersonId(Request $request){

        try {

            $auth_person_id = null;

            if (auth()->user()->isOwner()) {
                $ccsOrg = $this->ccsSetupRepo->findByUser(auth()->user()->id, []);
                $auth_person_id = $ccsOrg->person_id;
            } else {
                $auth_person_id = auth()->user()->ccs_id;
            }

            return $auth_person_id;

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }


}
