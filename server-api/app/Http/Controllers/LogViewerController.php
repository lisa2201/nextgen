<?php

namespace Kinderm8\Http\Controllers;

use Haruncpi\LaravelLogReader\LaravelLogReader;
use Helpers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogViewerController extends Controller
{
    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function getLogs(Request $request)
    {
        $date = (! Helpers::IsNullOrEmpty($request->input('date'))) ? $request->input('date') : null;

        return (new LaravelLogReader(['date' => $date]))->get();
    }
}
