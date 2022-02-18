<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class AuthLogType extends Enum
{
    const Login = 'LOGIN';
    const Logout =  'LOGOUT';
    const TokenRefreshed = 'TOKEN_REFRESHED';
}
