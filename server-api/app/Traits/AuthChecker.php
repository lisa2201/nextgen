<?php

namespace Kinderm8\Traits;

use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\RequestType;
use Kinderm8\Exceptions\Passport\AuthException;
use LocalizationHelper;

trait AuthChecker
{
    /**
     * check if user account is valid
     *
     * @param Model|null $user
     * @param null $client
     * @throws AuthException
     */
    protected function validateUser(?Model $user, $client = null)
    {
        // check if user object exists
        if(is_null($user))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_user'), RequestType::CODE_400);
        }

        // check if user has roles
        if(! $user->userHasAnyRoles())
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_does_not_have_role'), RequestType::CODE_400);
        }

        // user has permissions
        if(! $user->hasPermissions())
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_does_not_have_permission'), RequestType::CODE_400);
        }

        // check for inactive user
        if(! $user->isActive())
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_inactive'), RequestType::CODE_400);
        }

        // check for login access
        if(! $user->hasLoginAccess())
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_does_not_have_login_access'), RequestType::CODE_400);
        }

        // check if user account verified
        if(! $user->email_verified)
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_email_not_verified'), RequestType::CODE_400);
        }

        // site manager
        if($user->isOwner())
        {
            if(! $user->organization->email_verified)
            {
                throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_email_not_verified'), RequestType::CODE_400);
            }
        }

        // branch user
        if(! is_null($user->branch) && $user->isAdministrative())
        {
            if($user->branch->id !== (int) $client)
            {
                throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_not_exists'), RequestType::CODE_400);
            }
        }
    }

    /**
     * user validate for pin code login
     *
     * @param Model|null $user
     * @param null $client
     * @throws AuthException
     */
    protected function validatePincodeUser(?Model $user, $client = null)
    {
        // check if user object exists
        if(is_null($user))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.invalid_user'), RequestType::CODE_400);
        }

        //check for inactive user
        if(! $user->isActive())
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_inactive'), RequestType::CODE_400);
        }

        //branch user
        if(! is_null($user->branch) && $user->isAdministrative())
        {
            if($user->branch->id !== (int) $client)
            {
                throw new AuthException(LocalizationHelper::getTranslatedText('auth.user_not_exists'), RequestType::CODE_400);
            }
        }
    }

    /**
     * @param $data
     * @throws AuthException
     */
    protected function validateUserAttributes($data)
    {
        $data = json_decode(json_encode($data), true);

        if (empty($data['role']) || empty($data['permissions']) ||  empty($data['navigators']))
        {
            throw new AuthException(LocalizationHelper::getTranslatedText('auth.unauthorized_user'), RequestType::CODE_400);
        }
    }

    //set activity log
    /*activity()
        ->inLog('hello')
        ->causedBy($user)
        ->performedOn($user)
        ->withProperties(['key' => 'value'])
        ->tap(function(Activity $activity)
        {
            $activity->organization_id = $user->organization_id;
            $activity->branch_id = $user->organization_id;
        })
        ->log('edited');*/
}
