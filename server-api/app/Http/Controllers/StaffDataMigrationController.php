<?php

namespace Kinderm8\Http\Controllers;
use Kinderm8\Http\Controllers\Controller;
use Illuminate\Http\Request;
use DBHelper;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonPeriod;
use CCSHelpers;
use DateTimeHelper;
use Exception;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\System\ServerErrorException;
use RequestHelper;
use LocalizationHelper;
use Kinderm8\ParentDataMigration;
use Kinderm8\Sample4;
use Kinderm8\User;
use Kinderm8\Role;
use Kinderm8\Child;
use Kinderm8\Enums\RoleType;

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Kinderm8\Http\Resources\UserResourceCollection;
use Kinderm8\Http\Resources\RoleResourceCollection;
use Kinderm8\Repositories\Role\IRoleRepository;
use ErrorHandler;

class StaffDataMigrationController extends Controller
{

    private $roleRepo;

    public function __construct(IRoleRepository $roleRepo)
    {
        $this->roleRepo = $roleRepo;
    }
    public function getRoles(){

        $roles = [];

        try
        {
            $roles = $this->roleRepo->listRoleMigration([]);
            // \Log::info($roles);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return (new RoleResourceCollection($roles))
            ->response()
            ->setStatusCode(RequestType::CODE_200);

    }


    public function migrateUser(Request $request){

        $users = [];
        $user_array_id = [];
        DB::beginTransaction();

        try
        {
            $userData = DB::table($request->input('table') ? $request->input('table'): 'forbesdataeducator')->get();
            // \Log::info($request->all());
            // \Log::info($userData);

            // \Log::info('fn work');

            foreach($userData as $user) {

                // \Log::info('loop start');
                if(User::where('email', $user->email)->where('branch_id', Helpers::decodeHashedID($request->input('branch')))->get()->count() < 1) {

                    // \Log::info('create user start');
                    \Log::info($this->getName($user->fullname, true));
                    $userAcc = new User;
                    $userAcc->organization_id = Helpers::decodeHashedID($request->input('org'));
                    $userAcc->branch_id = Helpers::decodeHashedID($request->input('branch'));
                    $userAcc->email = $user->email;
                    $userAcc->first_name = $this->getName($user->fullname, true);
                    $userAcc->last_name = $this->getName($user->fullname, false);
                    $userAcc->password = $user->password;

                    $secEmail = $user->second_email !== '' ? true : false;
                    if($secEmail)
                        {
                            $userAcc->second_email =  $user->second_email;
                            $userAcc->need_sec_email = '1';
                        }
                    $userAcc->phone = $user->mobile;
                    $userAcc->address_1 = $user->address;
                    $userAcc->address_2 = '';
                    $userAcc->city = '';
                    $userAcc->zip_code = null;

                    $userAcc->status = $user->status === '0' ? '0' : '1';
                    $userAcc->login_access = $user->loginaccess === '0' ? '0' : '1';
                    $userAcc->remember_token = $user->remember_token;
                    $userAcc->site_manager = '0';
                    $userAcc->currentgen_id = $user->id;
                    $userAcc->email_verified = true;
                    $userAcc->pincode = $user->pincode ? $user->pincode : null;


                    $userAcc->save();

                    //attach roles to user
                    foreach($request->input('role') as $role) {

                        $roles = Role::find(Helpers::decodeHashedID($role));
                        // \Log::info($roles);
                        $userAcc->assignRole($roles);
                        // unset($roles);

                    }

                    \Log::info('create end');
                    array_push($user_array_id, $userAcc->id);


                }

                else {

                    return response()->json(
                        RequestHelper::sendResponse(RequestType::CODE_500, 'The specify email '. $user->email . ' already exist'
                        ), RequestType::CODE_500);

                }
            }

            // \Log::info($user_array_id);
            // \Log::info('task complete');
            $user = User::with(['organization', 'branch', 'roles', 'child'])->whereIn('id', $user_array_id)->get();

            DB::commit();
            return (new UserResourceCollection($user))
            ->response()
            ->setStatusCode(RequestType::CODE_200);
        }
        catch (Exception $e)
        {
            DB::rollBack();
            ErrorHandler::log($e);
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_500,
                    LocalizationHelper::getTranslatedText('system.internal_error')
                ),
                RequestType::CODE_500
            );
        }


        // return response()->json(
        //     RequestHelper::sendResponse(
        //         RequestType::CODE_201,
        //         LocalizationHelper::getTranslatedText('response.success_create'),
        //         new UserResourceCollection($user)
        //     ), RequestType::CODE_201);

    }

    public function getName(string $name, bool $type) {

        if ($name == trim($name) && strpos($name, ' ') !== false){

            $value = explode(" ", $name);

            return $type ? $value[0] : $value[1];

        }
        else {
            return $type ? $name : '';
        }

    }


}
