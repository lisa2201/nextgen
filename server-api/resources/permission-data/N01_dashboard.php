<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [

    [
        'name' => 'dashboard-access',
        'display_name' => 'View Dashboard',
        'description' => 'View all Dashboard Elements',
        'type' => 'Dashboard',
        'navigation_ref_id' => 'N01',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'show-daily-fee-widget',
        'display_name' => 'Show Daily Fee Widget',
        'description' => 'Show Daily Fee Widget',
        'type' => 'Dashboard',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW_CHILD
    ],
    [
        'name' => 'show-payment-summary-widget',
        'display_name' => 'Show Payment Summary Widget',
        'description' => 'Show Payment Summary Widget',
        'type' => 'Dashboard',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW_PAYMENT_SUMMARY_WIDGET
    ],
];
