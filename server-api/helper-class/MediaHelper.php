<?php

use Carbon\Carbon;
use Kinderm8\Enums\PathType;
use Kinderm8\User;

class MediaHelper
{
    public static function getPathPrefix()
    {
        $prefix = null;

        //auth()->user()->hasRole('org-admin')
        //$prefix = FileHelper::sanitizeText(auth()->user()->organization->company_name) . '/' . FileHelper::sanitizeText(auth()->user()->branch->name) . '/';

        if(auth()->check())
        {
            if(auth()->user()->hasRole('portal-admin'))
            {
                $prefix = PathType::ROOT_DIR . '/';
            }
            else
            {
                $prefix = FileHelper::sanitizeText(auth()->user()->organization->company_name) . '/';
            }
        }

        return $prefix;
    }

    public static function getAbsolutePath($url)
    {
        $search = ["https://", "http://", config('aws.bucket') . ".s3.". config('aws.region') . ".amazonaws.com/"];
        $replace = ["", "", ""];
        return str_replace($search, $replace, $url);
    }

    public static function getProfilePath($filename, User $user)
    {
        return self::getPathPrefix() . PathType::PROFILE_PATH . '/' . $user->index . '/' . $filename;
    }

    public static function getImagePath($filename)
    {
        return self::getPathPrefix() . PathType::IMAGE_PATH . '/' . Carbon::now()->format('Y-m-d') . '/' . $filename;
    }

    public static function getVideoPath($filename)
    {
        return self::getPathPrefix() . PathType::VIDEO_PATH . '/' . Carbon::now()->format('Y-m-d') . '/' . $filename;
    }

    public static function getAudioPath($filename)
    {
        return self::getPathPrefix() . PathType::AUDIO_PATH . '/' . Carbon::now()->format('Y-m-d') . '/' . $filename;
    }

    public static function getDocPath($filename)
    {
        return self::getPathPrefix() . PathType::DOC_PATH . '/' . Carbon::now()->format('Y-m-d') . '/' . $filename;
    }

    public static function getOtherPath($filename)
    {
        return self::getPathPrefix() . PathType::OTHER_PATH . '/' . Carbon::now()->format('Y-m-d') . '/' . $filename;
    }
}
