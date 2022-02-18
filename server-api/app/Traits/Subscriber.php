<?php

namespace Kinderm8\Traits;

use Exception;
use Helpers;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Kinderm8\Enums\AWSConfigType;
use Kinderm8\Enums\CurrentGenConnectType;
use Kinderm8\Enums\ErrorType;
use Kinderm8\Enums\RoleType;
use LocalizationHelper;

trait Subscriber
{
    /**
     * create branch user for site-manager
     * @param Model $branch
     * @param string $action
     */
    protected function managerBranchAccess(Model $branch, string $action = 'new')
    {
        if (auth()->user()->isOwner())
        {
            if ($action !== 'new')
            {
                $profile = $this->userRepo->withTrashed()
                    ->where('email', auth()->user()->email)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->whereIn('branch_id', $branch->id)
                    ->delete();
            }
            else
            {
                $profile = auth()->user()->replicate();
                $profile->site_manager = '1';
                $profile->branch_id = $branch->id;
                $profile->push();

                // get branch admin role
                $admin_role = $this->roleRepo->findByType(
                    RoleType::ADMINPORTAL,
                    [
                        'org' =>  $branch->organization_id,
                        'administrator' => '1'
                    ],
                    []
                );

                $profile->syncRoles($admin_role);
            }

            // send sns if branch is connected to current gen (kinder connect)
            if ($branch->kinderconnect)
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $profile->organization_id,
                        'branch' => $profile->branch_id,
                        'subjectid' => $profile->id,
                        'role' => 'administrator',
                        'action' => $action !== 'new' ? CurrentGenConnectType::ACTION_DELETE : CurrentGenConnectType::ACTION_CREATE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }
        }
    }

    /**
     * send sns to kinder connect
     * @param Model $user
     * @param Model $branch
     * @param string $action
     */
    protected function sendSNS(Model $user, Model $branch, string $action = 'new')
    {
        // send sns if branch is connected to current gen (kinder connect)
        if ($branch->kinderconnect)
        {
            $this->snsService->publishEvent(
                Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                [
                    'organization' => $user->organization_id,
                    'branch' => $user->branch_id,
                    'subjectid' => $user->id,
                    'role' => $user->getRoleTypeForKinderConnect(),
                    'action' => $action !== 'new' ? CurrentGenConnectType::ACTION_DELETE : CurrentGenConnectType::ACTION_CREATE
                ],
                CurrentGenConnectType::USER_SUBJECT
            );
        }
    }

    /**
     * @param Model $user
     * @param Request $request
     * @return array
     * @throws Exception
     */
    protected function linkBranchesToSiteManager(Model $user, Request $request)
    {
        // get branch admin role
        $admin_role = $this->roleRepo->findByType(
            RoleType::ADMINPORTAL,
            [
                'org' =>  $user->organization_id,
                'administrator' => '1'
            ],
            []
        );

        if (is_null($admin_role))
        {
            throw new Exception(LocalizationHelper::getTranslatedText('organization.admin_role_not_found'), ErrorType::CustomValidationErrorCode);
        }

        // link branches
        $list = $this->organizationRepo->linkBranches($user, $admin_role, 'User', $request);

        // send sns if branch is connected to current gen (kinder connect)
        foreach ($list['items'] as $user)
        {
            if ($user['branch']['kinderconnect'])
            {
                $this->snsService->publishEvent(
                    Helpers::getConfig('kinder_connect_user', AWSConfigType::SNS),
                    [
                        'organization' => $user['organization_id'],
                        'branch' => $user['branch_id'],
                        'subjectid' => Helpers::decodeHashedID($user['index']),
                        'role' => 'administrator',
                        'action' => $list['action_is_new'] ? CurrentGenConnectType::ACTION_CREATE : CurrentGenConnectType::ACTION_DELETE
                    ],
                    CurrentGenConnectType::USER_SUBJECT
                );
            }
        }

        return $list;
    }
}
