<?php

namespace Kinderm8\Traits;

use Helpers;
use Illuminate\Database\Eloquent\Model;
use Kinderm8\Enums\AWSConfigType;

trait SNSActions
{
    /**
     * Send sns if branch is connected to current gen (kinder connect)
     *
     * @param Model|null $model
     * @param bool $has_kinder_connect_access
     * @param string $config
     * @param string $sns_action
     * @param string $sns_subject
     */
    protected function publish(?Model $model, bool $has_kinder_connect_access, string $config, string $sns_action, string $sns_subject)
    {
        if ($has_kinder_connect_access)
        {
            $params = [
                'organization' => $model->organization_id,
                'branch' => $model->branch_id,
                'subjectid' => $model->id,
                'action' => $sns_action
            ];

            if ($model->getMorphClass() === 'Kinderm8\User')
            {
                $params['role'] = $model->getRoleTypeForKinderConnect();
            }

            $this->snsService->publishEvent(
                Helpers::getConfig($config, AWSConfigType::SNS),
                $params,
                $sns_subject
            );
        }
    }
}
