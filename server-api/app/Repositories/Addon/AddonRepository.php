<?php

namespace Kinderm8\Repositories\Addon;

use Kinderm8\Addon;

class AddonRepository implements IAddonRepository
{
    private $addon;

    public function __construct(Addon $addon)
    {
        $this->addon = $addon;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->addon, $method], $args);
    }
}
