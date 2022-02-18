<?php

namespace Kinderm8\Http\ResourceHelpers;

class OrganizationResourceHelper
{
    public static function  getStatusHtml($status)
    {
        if($status == 'pending')
        {
            $html = '<i class="icon-checkbox-marked-circle yellow-600-fg"></i>';
        }
        else if($status == 'email_verification')
        {
            $html = '<i class="icon-checkbox-marked-circle yellow-800-fg"></i>';
        }
        else if($status == 'active')
        {
            $html = '<i class="icon-checkbox-marked-circle green-600-fg"></i>';
        }
        else if($status == 'canceled')
        {
            $html = '<i class="icon-checkbox-marked-circle red-600-fg"></i>';
        }
        else if($status == 'expired')
        {
            $html = '<i class="icon-checkbox-marked-circle orange-600-fg"></i>';
        }
        else
        {
            $html = '<i class="icon-checkbox-marked-circle red-900-fg"></i>';
        }

        return $html;
    }
}