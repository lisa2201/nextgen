<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'notification-access',
        'display_name' => 'View Notification Settings',
        'description' => null,
        'type' => 'Notification Settings',
        'navigation_ref_id' => 'N19',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];
