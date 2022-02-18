<?php

namespace Kinderm8\Http\Controllers;

use Aws\Credentials\Credentials;
use Aws\S3\S3Client;
use Aws\S3\S3MultiRegionClient;
use Carbon\Carbon;
use DateTimeHelper;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Enums\RequestType;
use Kinderm8\Http\Resources\BranchResource;
use Kinderm8\Http\Resources\RoomResourceCollection;
use Kinderm8\Http\Resources\SubscriptionPlansResourceCollection;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\PaymentInformations;
use Kinderm8\Repositories\Branch\IBranchRepository;
use Kinderm8\Repositories\Child\IChildRepository;
use Kinderm8\Repositories\Room\IRoomRepository;
use Kinderm8\Repositories\User\IUserRepository;
use Kinderm8\SubscriptionPlans;
use Kinderm8\SubscriptionVerifyCode;
use Kinderm8\ReportField;
use Kinderm8\CcsSetup;
use Kinderm8\Http\Requests\S3SignedUrlRequest;
use Illuminate\Validation\ValidationException;
use LocalizationHelper;
use RequestHelper;
use Kinderm8\ProviderSetup;
use Kinderm8\ServiceSetup;

class CommonController extends Controller
{
    private $branchRepo;
    private $userRepo;
    private $roomRepo;
    private $childRepo;

    public function __construct(IBranchRepository $branchRepo, IUserRepository $userRepo, IRoomRepository $roomRepo, IChildRepository $childRepo)
    {
        $this->branchRepo = $branchRepo;
        $this->userRepo = $userRepo;
        $this->roomRepo = $roomRepo;
        $this->childRepo = $childRepo;
    }

    /**
     * get subscription plans
     * @param Request $request
     * @return mixed
     */
    public function getSubscriptionPlans(Request $request)
    {
        try
        {
            $australia = 'AU';

            //Find top level domain
            if(!empty($request->query('country_code')))
            {
                //2 letter country code
                $tld = strtoupper($request->query('country_code'));
            }
            else
            {
                $url = parse_url($request->url());
                $host = explode('.',$url['host']);
                $tld = strtoupper(end($host));
            }

            if($tld == $australia)
            {
                $plans = SubscriptionPlans::whereNotNull('base_price')
                    ->whereNull('country_code')
                    ->orWhere('country_code', '=', $australia)
                    ->orderBy('id', 'asc')
                    ->get();

            }
            else
            {
                $plans = SubscriptionPlans::whereNotNull('base_price')
                    ->whereNull('country_code')
                    ->orWhere('country_code', '!=', $australia)
                    ->orderBy('id', 'asc')
                    ->get();
            }

            return (new SubscriptionPlansResourceCollection($plans))
                ->response()
                ->setStatusCode(RequestType::CODE_200);
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    /**
     * get organization informations
     * @param Request $request
     * @return mixed
     */
    public function verifyOrganization(Request $request)
    {
        $org = null;

        try
        {
            $domain = (! Helpers::IsNullOrEmpty($request->input('domain'))) ? rtrim($request->input('domain')) : null;

            if (!is_null($domain))
            {
                /*$org = Cache::remember(CacheHelper::getCachePrefixDomain(CacheHelper::CACHE_DOMAIN_CHECK), 60 * 5, function () use ($domain)
                {
                    return Branch::with('organization')
                        ->where('subdomain_name', '=', $domain)
                        ->get()
                        ->first();
                });*/

                $org = $this->branchRepo->findByDomain($domain, null, false, ['organization']);
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new BranchResource($org, [ 'basic' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * check if value exists in database based on perms
     * @param Request $request
     * @return array
     */
    public function checkValueExists(Request $request)
    {
        $exists = false;

        try
        {
            $value = rtrim($request->input('value'));
            $type = rtrim($request->input('type'));
            $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;
            $query = null;

            if ($value != '' && $type != '')
            {
                if ($type == 'branch.domain')
                {
                    $query = $this->branchRepo->withTrashed()->where('subdomain_name', '=', $value);
                }
                elseif ($type == 'branch.name')
                {
                    $query = $this->branchRepo->withTrashed()->where('name', '=', $value);
                }
                elseif ($type == 'branch.pincode')
                {
                    $query = $this->branchRepo->withTrashed()->where('pincode', '=', $value);
                }

                elseif ($type == 'user.email')
                {
                    $query = $this->userRepo
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('email', '=', $value)
                        ->orWhere('second_email', '=', $value);

                }
                elseif ($type == 'user.pincode')
                {
                    $query = $this->userRepo
                        ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('pincode', '=', $value);
                }

                elseif ($type == 'user.phone')
                {
                    $query = $this->userRepo
                        ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('phone', '=', $value);
                }

                elseif ($type == 'subcode.email')
                {
                    $query = SubscriptionVerifyCode::where('email', '=', $value);
                }

                elseif ($type == 'provider.id')
                {
                    $query = ProviderSetup::where('provider_id', '=', $value)
                    ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null);
                }

                elseif ($type == 'service.id')
                {
                    $query = ServiceSetup::where('service_id', '=', $value)
                    ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null);
                }

                if ($type == 'room.name')
                {
                    $query = $this->roomRepo
                        ->where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('title', '=', $value);
                }
                if ($type == 'reportAddon.name')
                {
                    $name = 'name';
                    $queryBranch = ReportField::where('organization_id', auth()->user()->organization_id ? auth()->user()->organization_id : null)
                        ->where('branch_id', auth()->user()->branch_id? auth()->user()->branch_id : null)
                        ->where('name','=', $value);

                    $queryDefault = ReportField::where('organization_id', null)
                        ->where('branch_id', null)
                        ->where('name','=', $value);

                    $queryDefault ? $query = $queryDefault : $query = $queryBranch;
                }


                //ccs code exit check
                if ($type == 'ccs.code')
                {
                    $query = CcsSetup::where('organization_id', auth()->user()->organization_id)
                        ->where('activation_code', '=', $value);
                }

                //ignore this data
                if (!is_null($index) && $type != 'ccs.code')
                {
                    $query->where('id', '!=', $index);
                }

                $exists = ($query->get()->count() > 0) ? true : false;
                // when checking phone number, get the user of the existing phone number.
                if($type == 'user.phone')
                {
                    $userName = $query->get()->first();
                    if($userName)
                    {
                        if($query->get()->first()->isEmergencyContact())
                            $userType = 'Emergency Contact';
                        elseif($query->get()->first()->isParent())
                            $userType = 'Parent';
                        else
                            $userType = 'User';
                    }
                }

            }

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return response()->json(
            RequestHelper::sendResponse(
                RequestType::CODE_200,
                LocalizationHelper::getTranslatedText('response.success_request'),
                [ 'found' => $exists,
                  'name' => ($exists && $type == 'user.phone')? $userName->full_name : ' ',
                  'type' => ($exists && $type == 'user.phone')? $userType : ' ']
            ), RequestType::CODE_200);
    }

    /*----------------------------------------------------------------*/

    /*
     * get custom time values
     * @return mixed
     */
    public function getCustomTimeValues(Request $request)
    {
        try
        {
            $startValue = $request->input('start') > 0 ? (int) $request->input('start') + 1 : null;
            $timeList = [];

            if(is_null($startValue))
            {
                $value = (array) $request->input('search');
                $hourBoundary = (int) $value[0];
                $minBoundary = (count($value) > 1) ? (int) $value[1] : 0;

                //am
                for ($m = $minBoundary; $m < 60; $m++)
                {
                    $_m = ($hourBoundary * 60) + $m;

                    $dt = Carbon::now();
                    $dt->hour($hourBoundary)->minute($m)->second(0);

                    array_push($timeList, [
                        'id' => $_m,
                        'text' => $dt->format('g:i a')
                    ]);
                }

                //pm
                for ($m = $minBoundary; $m < 60; $m++)
                {
                    $_m = (($hourBoundary + 12) * 60) + $m;

                    $dt = Carbon::now();
                    $dt->hour($hourBoundary + 12)->minute($m)->second(0);

                    array_push($timeList, [
                        'id' => $_m,
                        'text' => $dt->format('g:i a')
                    ]);
                }
            }
            else
            {
                for ($m = $startValue; $m <= 1440; $m++)
                {
                    $time = DateTimeHelper::formatMinToTimeArray($m);

                    $dt = Carbon::now();
                    $dt->hour((int) $time['hour'])->minute((int) $time['min'])->second(0);

                    array_push($timeList, [
                        'id' => $m,
                        'text' => $dt->format('g:i a')
                    ]);
                }
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $timeList
                ), RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }

    /**
     * get country states
     * @param Request $request
     * @return JsonResponse
     */
    public function countryStates(Request $request)
    {
        try
        {
            $validator = Validator::make($request->all(), [
                'country' => 'required'
            ]);

            if($validator->fails()) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );

            }

            $country_code = $request->input('country');

            $json_data = json_decode(file_get_contents(resource_path('data/states.json')),true);

            $index = array_search($country_code, array_column($json_data, 'code2'));

            $states = [];

            if($index !== false) {
                $states = isset($json_data[$index]) && isset($json_data[$index]['states']) ? $json_data[$index]['states'] : [];
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    ['states' => $states]
                ),
                RequestType::CODE_200
            );

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

    /*----------------------------------------------------------------*/

    /**
     * get parent type list (child)
     * @param Request $request
     * @return JsonResponse
     */
    public function getParentTypeUsersForChild(Request $request)
    {
        $user_list = [];

        try
        {
            $id = !Helpers::IsNullOrEmpty($request->input('id')) ? Helpers::decodeHashedID($request->input('id')) : null;

            $childObj = !is_null($id) ? $this->childRepo->findById($id, ['parents']) : null;

            $user_list = $this->userRepo->findParentByChild($request, $childObj, false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new UserResourceCollection($user_list, [ 'short' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * get user list for mergency contacts
     * @param Request $request
     * @return JsonResponse
     */
    public function getUsersForEmergencyContacts(Request $request)
    {
        $user_list = [];

        try
        {
            $id = !Helpers::IsNullOrEmpty($request->input('id')) ? Helpers::decodeHashedID($request->input('id')) : null;

            $childObj = !is_null($id) ? $this->childRepo->findById($id, ['emergency']) : null;

            $user_list = $this->userRepo->findUserForEmergencyContacts($request, $childObj, false);

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new UserResourceCollection($user_list))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * get room list (child)
     * @param Request $request
     * @return JsonResponse
     */
    public function getRoomsForChild(Request $request)
    {
        $room_list = [];

        try
        {
            $id = !Helpers::IsNullOrEmpty($request->input('id')) ? Helpers::decodeHashedID($request->input('id')) : null;

            $childObj = !is_null($id) ? $this->childRepo->findById($id, ['rooms']) : null;

            $room_list = $this->roomRepo->findRoomsForChild($request, $childObj, false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new RoomResourceCollection($room_list))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * get rooms by user
     * @param Request $request
     * @return JsonResponse
     */
    public function getRoomsForUser(Request $request)
    {
        $room_list = [];

        try
        {
            $id = !Helpers::IsNullOrEmpty($request->input('id')) ? Helpers::decodeHashedID($request->input('id')) : null;

            $userObj = !is_null($id) ? $this->userRepo->findById($id, ['rooms']) : null;

            $room_list = $this->roomRepo->findRoomsForUser($request, $userObj, false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new RoomResourceCollection($room_list))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getRoomsForBranch(Request $request): JsonResponse
    {
        $room_list = [];

        try {
            $validator = Validator::make($request->all(), [
                'id' => 'required'
            ]);

            if ($validator->fails()) {

                return response()->json(
                    RequestHelper::sendResponse(
                        RequestType::CODE_400,
                        LocalizationHelper::getTranslatedText('system.missing_parameters')
                    ),
                    RequestType::CODE_400
                );

            }

            $branch_id = !Helpers::IsNullOrEmpty($request->input('id')) ? Helpers::decodeHashedID($request->input('id')) : auth()->user()->branch_id;

            $room_list = $this->roomRepo->findRoomsForBranch($request, $branch_id, false);

        } catch (Exception $e) {
            ErrorHandler::log($e);
        }

        return (new RoomResourceCollection($room_list))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /**
     * get administrative type list
     * @param Request $request
     * @return JsonResponse
     */
    public function getAdministrativeTypeUsers(Request $request)
    {
        $user_list = [];

        try
        {
            $user_list = $this->userRepo->findAdministrativeUsers($request, false, false);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new UserResourceCollection($user_list, [ 'short' => true ]))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
    }

    /*----------------------------------------------------------------*/

    public function getPaymentInfo(Request $request)
    {
        try
        {
            $payments = PaymentInformations::where('organization_id', $request->user()->organization->id)->get();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [ 'info' => $payments ]
                ),
                RequestType::CODE_200
            );

        }
        catch (Exception $e)
        {
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

    public function getPreSignedUrl(Request $request)
    {
        try
        {

            // validation
            app(S3SignedUrlRequest::class);

            $s3Client = new S3Client([
                'region' => 'ap-southeast-2',
                'version' => '2006-03-01',
                'credentials' => new Credentials(
                    config('aws.s3_access_key'),
                    config('aws.s3_secret_key')
                )
            ]);

            $command = $s3Client->getCommand('PutObject', [
                'Bucket' => $request->input('bucket'),
                'Key' => $request->input('name'),
                'ACL' => 'public-read'
            ]);

            $request = $s3Client->createPresignedRequest($command, '+10 minutes');
            $presignedUrl = (string)$request->getUri();

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    $presignedUrl
                ),
                RequestType::CODE_200
            );
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            if($e instanceof ValidationException)
            {
                throw new ValidationException($e->validator);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }
    }
}
