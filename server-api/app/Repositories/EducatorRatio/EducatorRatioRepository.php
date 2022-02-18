<?php

namespace Kinderm8\Repositories\EducatorRatio;

use Carbon\Carbon;
use ErrorHandler;
use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\EducatorRatio;
use Kinderm8\Enums\CCSType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Exceptions\System\ResourceNotFoundException;
use Kinderm8\SessionSubmission;
use Kinderm8\Traits\UserAccessibility;
use LocalizationHelper;

class EducatorRatioRepository implements IEducatorRatioRepository
{
    use UserAccessibility;

    private $eduRatio;

    private $sortColumnsMap = [
        'email' => 'user_email',
        'branch' => 'name',
        'expires' => 'expires_at'
    ];

    public function __construct(EducatorRatio $educatorRatio)
    {
        $this->eduRatio = $educatorRatio;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->eduRatio, $method], $args);
    }

    /**
     * @param $args
     * @param Request $request
     * @return array
     */
    public function get($args, Request $request)
    {
        $actualCount = 0;
        $filters = null;

        try
        {

            //query builder
            $eduRatio = $this->eduRatio;



            //get actual count
            $actualCount = $eduRatio->get()->count();


            $eduRatio = $eduRatio
                ->orderBy('km8_educator_ratio.state', 'DESC')
                ->orderBy('km8_educator_ratio.age_order', 'ASC')
                ->select(['km8_educator_ratio.*'])->get();

        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $eduRatio = [];
        }

        return [
            'list' => $eduRatio,
            'actual_count' => $actualCount,
            'filters' => $filters
        ];
    }


}
