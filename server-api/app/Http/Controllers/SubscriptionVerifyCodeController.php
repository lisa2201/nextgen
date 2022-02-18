<?php

namespace Kinderm8\Http\Controllers;

use Carbon\Carbon;
use DB;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Http\Request;
use Kinderm8\Enums\RequestType;
use Kinderm8\Notifications\SendSubscriptionCodeMail;
use Kinderm8\SubscriptionVerifyCode;
use LocalizationHelper;
use PathHelper;
use RequestHelper;

class SubscriptionVerifyCodeController extends Controller
{
    /**
     * return unique code
     * @return mixed
     */
    public function getCode()
    {
        try
        {
            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    [
                        'code' => Helpers::generateSerialCode()
                    ]
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
     * check if user email exists
     * @param Request $request
     * @return {boolean}
     */
    public function emailExists(Request $request)
    {
        try
        {
            $value = rtrim($request->input('value'));

            $index = ($request->input('id') != '') ? Helpers::decodeHashedID($request->input('id')) : null;

            $query = SubscriptionVerifyCode::where('email', '=', $value);

            //ignore this data
            if (!is_null($index))
            {
                $query->where('id', '!=', $index);
            }

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_200,
                    LocalizationHelper::getTranslatedText('response.success_request'),
                    (($query->get()->count() > 0) ? true : false)
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
     * get all subscription codes
     * @return {array} list
     */
    public function get()
    {
        $list = [];

        try
        {
            $list = SubscriptionVerifyCode::orderBy('id', 'asc')->get();
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        //return $this->response->withCollection($list, new SubscriptionVerifyCodeTransformers);
    }

    /**
     * Store subscription code object
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function create(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $obj = new SubscriptionVerifyCode();

            $obj->code = $request->input('code');
            $obj->email = $request->input('email');
            $obj->expires_at = Carbon::now()->addDays((int) $request->input('expiry'));

            $obj->save();

            DB::commit();

            //send mail
            $obj->notify(new SendSubscriptionCodeMail(
                PathHelper::getSubscriptionVerifyCodePath($request->fullUrl(), $obj->code)
            ));

            return response()->json(
                RequestHelper::sendResponse(
                    RequestType::CODE_201,
                    LocalizationHelper::getTranslatedText('response.success_create')
                ), RequestType::CODE_201);
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

    /**
     * Update subscription code object
     * @param Request $request
     * @return mixed
     */
    public function update()
    {

    }

    /**
     * delete subscription code object
     * @param Request $request
     * @return mixed
     * @throws \Exception
     */
    public function delete(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $id = Helpers::decodeHashedID($request->input('id'));

            $codeObj = SubscriptionVerifyCode::find($id);

            if (is_null($codeObj))
            {
                return response()->json(
                    RequestHelper::sendResponse(RequestType::CODE_404, LocalizationHelper::getTranslatedText('response.resource_not_found')
                ), RequestType::CODE_404);
            }

            $codeObj->delete();

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

            ErrorHandler::log($e);

            return response()->json(
                RequestHelper::sendResponse(RequestType::CODE_500, LocalizationHelper::getTranslatedText('system.internal_error')
            ), RequestType::CODE_500);
        }
    }
}
