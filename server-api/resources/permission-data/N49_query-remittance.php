<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'query-remittance-by-CCS-approval',
        'display_name' => 'View Query Remittance by CCS Approval',
        'description' => 'View Query Remittance by CCS Approval',
        'type' => 'CCMS Operations',
        'navigation_ref_id' => 'N49',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];
