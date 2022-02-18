<?php

class ImageHelper
{
    public static function getProductLogo()
    {
        //return asset('');
        // return "https://kinderm8.com.au/wp-content/uploads/2019/09/LOGO-H100b.png";
        return 'https://d212imxpbiy5j1.cloudfront.net/img/uploads/production_1529557627.kinderm8logo.png';
    }

    public static function getProductLogoIOS()
    {
        //return asset('');
        // return "https://kinderm8.com.au/wp-content/uploads/2019/09/LOGO-H100b.png";
        return 'https://kinderm8nexrgen.s3-ap-southeast-2.amazonaws.com/common/ios.png';
    }

    public static function getProductLogoGoogle()
    {
        //return asset('');
        return "https://kinderm8nexrgen.s3-ap-southeast-2.amazonaws.com/common/android.png";
    }

    public static function getProductWaveIcon()
    {
        //return asset('');
        return "https://cdn.systweak.com/content/wp/systweakblogsnew/uploads_new/2020/01/Wave-On-Facebook.png";
    }

    public static function getBranchImagePath($url)
    {
        return $url == null || $url == '' ? '' : 'https://kinderm8nexrgen.s3-ap-southeast-2.amazonaws.com/' . $url;
    }


}
