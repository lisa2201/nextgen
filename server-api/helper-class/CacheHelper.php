<?php

class CacheHelper
{
    public static function getCachePrefixDomain($key, $domain = null)
    {
        return  (is_null($domain) ? RequestHelper::getDomain() : $domain) . '_' . $key;
    }

    public static function getCachePrefixUser($key)
    {
        return auth()->user()->id . '_' . $key;
    }

    public static function getCachePrefixClient($key)
    {
        return auth()->user()->organization_id . '_' . auth()->user()->branch_id . '_' . $key;
    }

    public static function getCachePrefixBranchUser($key)
    {
        return auth()->user()->organization_id . '_' . auth()->user()->branch_id . '_' . auth()->user()->id . '_' . $key;
    }

    //cache query keys
    const CACHE_DOMAIN_CHECK = 'domain_check';
}