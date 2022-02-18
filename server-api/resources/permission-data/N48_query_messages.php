<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'ccms-operation',
        'display_name' => 'View CCMS operation',
        'description' => 'Display Message',
        'type' => 'Message',
        'navigation_ref_id' => 'N48',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];
