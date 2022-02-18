<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'financial-statements-access',
        'display_name' => 'Display Financial Statements',
        'description' => 'View Financial Statements',
        'type' => 'Financial Statements',
        'navigation_ref_id' => 'N36',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'financial-statements-create',
        'display_name' => 'Create Financial Statements',
        'description' => 'Create Financial Statements',
        'type' => 'Financial Statements',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];
