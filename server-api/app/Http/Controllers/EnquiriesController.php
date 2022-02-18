<?php

namespace Kinderm8\Http\Controllers;

use Illuminate\Http\Response;
use Kinderm8\Branch;
use Kinderm8\Enums\RequestType;
use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Kinderm8\Models\Enquiries;
use Kinderm8\Notifications\SendWaitlistForm;
use LocalizationHelper;
use RequestHelper;
use PathHelper;
use Illuminate\Support\Facades\Log;
use Kinderm8\Repositories\Branch\IBranchRepository;

class EnquiriesController extends Controller
{

    private $branchRepo;

    /**
     * @param IBranchRepository $branchRepo
     */
    public function __construct(IBranchRepository $branchRepo)
    {
        $this->branchRepo = $branchRepo;
    }

    /**
     * Handle the incoming request.
     *
     * @param Request $request
     * @return Response
     */

    public function storeEnquiry(Request $request)
    {

        try {

            $validator = Validator::make($request->all(), [
                'first_name' => ['required'],
                'email' => ['required']
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

            $enquiryObj = [
                'firstname' => $request->input('first_name'),
                'lastname' => $request->input('last_name'),
                'email' => $request->input('email'),
                'mobile' => $request->input('mobile'),
                'age' => $request->input('age')
            ];

            DB::beginTransaction();
            $enquiry = new Enquiries();

            $enquiry->organization_id = Helpers::decodeHashedID($request->input('org_id'));
            $enquiry->branch_id = Helpers::decodeHashedID($request->input('branch_id'));
            $enquiry->status = 0;
            $enquiry->enquiry_info = $enquiryObj;
            $enquiry->save();

            DB::commit();

            $branch_settings = Branch::find(Helpers::decodeHashedID($request->input('branch_id')))->center_settings;
            $redirect_url = (isset($branch_settings['enquiry_redirection_url']) && ($branch_settings['enquiry_redirection_url'] != ''))? $branch_settings['enquiry_redirection_url'] : '';

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create'),
                    $redirect_url
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

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendWaitlistLink(Request $request)
    {

        try {

            $enquiry = Enquiries::find(Helpers::decodeHashedID($request->input('id')));

            DB::beginTransaction();

            $enquiry->status = 1;
            $enquiry->save();

            DB::commit();

            $id = $request->input('id');

            $branch = Branch::where('organization_id', '=', $enquiry->organization_id)->where('id', '=', $enquiry->branch_id)->first();
            $branch_subdomain_name = $branch->subdomain_name;
            $branch_logo = $branch->branch_logo;

            /*------------- Send Mail --------------*/

            $enquiry->notify(new SendWaitlistForm(
                \ImageHelper::getBranchImagePath($branch_logo) ,
                $branch->name,
                PathHelper::getWaitlistLink($request->fullUrl(), $id, $branch_subdomain_name, true)
            ));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_create')
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

}
