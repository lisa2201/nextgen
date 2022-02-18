<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class PathHelper
{
    const KINDER_CONNECT_PREFIX = 'ccs-';

    public static function getProductionPath()
    {
        return config('app.production_path');
    }

    public static function isDevelopmentEnv()
    {
        return (!in_array($_SERVER['REMOTE_ADDR'], array('127.0.0.1','::1'))) ? false : true;
    }

    public static function getDevelopmentPort($url)
    {
        try
        {
            return parse_url($url)['port'];
        }
        catch (Exception $r)
        {
            return '4200';
        }
    }

    public static function getPortalPath($url)
    {
        $result = parse_url($url);

        if (self::isDevelopmentEnv())
        {
            return $result['scheme'] . "://portal.localhost:" . self::getDevelopmentPort($url) . "/";
        }
        else
        {
            return $result['scheme'] . "://portal." . self::getProductionPath() . "/";
        }
    }

    public static function getSiteManagerPath($url)
    {
        $result = parse_url($url);

        if (self::isDevelopmentEnv())
        {
            return $result['scheme'] . "://site-manager.localhost:" . self::getDevelopmentPort($url) . "/";
        }
        else
        {
            return $result['scheme'] . "://site-manager." . self::getProductionPath() . "/";
        }
    }

    public static function getSubscriptionEmailVerificationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://marketplace.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/subscribe?verify-token=' . $token;
    }

    public static function getCustPlanEmailVerificationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://marketplace.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/cust_plan?verify-token=' . $token;
    }

    public static function getUserInvitationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://invite.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/invitation?token=' . $token;
    }

    public static function getSubscriptionActivationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/subscribe?active-token=' . $token;
    }

    public static function getSubscriptionVerifyCodePath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/subscribe?verify-token=' . $token;
    }

    public static function getSubscriptionPaymentInfoPath($url, $id)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://marketplace.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/subscription-payment-info?org=' . $id;
    }

    public static function getQuotationVerificationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://marketplace.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/quotation-verify?quotation-token=' . $token;
    }

    public static function getBranchUrls($url, $domain)
    {
        $result = parse_url($url);

        if ($domain instanceof Collection)
        {
            $urlList = [];

            foreach ($domain as $dom)
            {
                array_push(
                    $urlList,
                    $result['scheme'] . '://'. ($dom->kinderconnect ? self::KINDER_CONNECT_PREFIX : '') . rtrim($dom->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath())
                );
            }

            return $urlList;
        }
        else
        {
            return $result['scheme'] . '://' . ($domain->kinderconnect ? self::KINDER_CONNECT_PREFIX : '') . rtrim($domain->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath());
        }
    }

    public static function getBranchUrlsKinderConnect($url, $domain, $hasAdminPrivileges)
    {
        $result = parse_url($url);

        if($domain instanceof Collection)
        {
            $urlList = [];

            foreach ($domain as $dom)
            {
                if($hasAdminPrivileges)
                {
                    array_push(
                        $urlList,
                        $result['scheme'] . '://'. self::KINDER_CONNECT_PREFIX . rtrim($dom->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath())
                    );
                }
                else
                {
                    array_push(
                        $urlList,
                        $result['scheme'] . '://'. ($dom->kinderconnect ?  '' : self::KINDER_CONNECT_PREFIX) . rtrim($dom->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath())
                    );
                }
            }

            return $urlList;
        }
        else
        {
            return $result['scheme'] . '://' . ($domain->kinderconnect ?  '' : self::KINDER_CONNECT_PREFIX) . rtrim($domain->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath());
        }
    }

    public static function getWaitlistLink($url, $id , $domain, $kinderConnect)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://' . ($kinderConnect ? self::KINDER_CONNECT_PREFIX : '')
            . rtrim($domain) . '.'
            . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/waitlist-form' . '/' . $id;
    }

    public static function getEnrollmentLink($url, $id , $domain, $kinderConnect)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://' . ($kinderConnect ? self::KINDER_CONNECT_PREFIX : '')
            . rtrim($domain) . '.'
            . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/enrolment-form' . '/' . $id;
    }

    public static function getUserPasswordSetupInvitationPath($url, $token)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://password-setup.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/password?id=' . $token;
    }

    public static function getKinderConnectAccessPath($url, $domain, $token, $path = null)
    {
        $result = parse_url($url);

        return $result['scheme'] . '://' . $domain . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath()) . '/kinder-connect-access?token=' . $token;
    }

    public static function getFullS3Link(string $path)
    {
        return config('aws.s3_prefix') . $path;
    }

    public static function getForgotPasswordLink(string $url, Model $user, string $token)
    {
        $result = parse_url($url);

        if ($user->hasOwnerAccess())
        {
            $link = $result['scheme'] . '://site-manager.' . (self::isDevelopmentEnv() ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath());
        }
        else
        {
            $link = $result['scheme'] . '://' . ($user->branch->kinderconnect ? self::KINDER_CONNECT_PREFIX : '') . rtrim($user->branch->subdomain_name) . '.' . ((self::isDevelopmentEnv()) ? 'localhost:' . self::getDevelopmentPort($url) : self::getProductionPath());
        }

        return $link . '/reset-password?token=' . $token . '&ref=' . $user->index;
    }

    public static function getKinderConnectUrl(string $url)
    {
        return str_replace(self::KINDER_CONNECT_PREFIX, "", $url);
    }
}
