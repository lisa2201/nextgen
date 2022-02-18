<?php

use Kinderm8\Enums\RoleType;

class EmailHelper
{
    public static function getMailTemplateProps($userType = null)
    {
        $returnData = [];

        if ($userType == RoleType::ORGADMIN || $userType == RoleType::SUPERADMIN)
        {
            $returnData = [
                'logo' => \ImageHelper::getProductLogo(),
                'title' => 'Welcome to ' . config('app.name'),
                'name' => config('mail.from.name')
            ];
        }
        else
        {

        }

        return $returnData;
    }

    public static function getMailTemplatePropsAppsImage($userType = null)
    {
        $returnData = [];

        if ($userType == RoleType::ORGADMIN || $userType == RoleType::SUPERADMIN)
        {
            $returnData = [
                'logoIOS' => \ImageHelper::getProductLogoIOS(),
                'logoGoogle' => \ImageHelper::getProductLogoGoogle(),
                'titleIOS' => 'IOS',
                'titleGoogle' => 'Goole Play',
                'name' => config('app.name'),
                'urlIOS' => 'https://apps.apple.com/au/app/kinder-m8-family-lounge/id1239664130',
                'urlGoogle' => 'https://play.google.com/store/apps/details?id=com.kinderm8.proitzen&hl=en',
                'wave' => \ImageHelper::getProductWaveIcon()
            ];
        }
        else
        {

        }

        return $returnData;
    }

}
