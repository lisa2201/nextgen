<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'care-provided-vacancy-access',
        'display_name' => 'Display Care Provided Vacancy',
        'description' => 'Display Care Provided Vacancy',
        'type' => 'Care Provided Vacancy',
        'navigation_ref_id' => 'N32',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'care-provided-vacancy-create',
        'display_name' => 'Create Care Provided Vacancy',
        'description' => 'Create Care Provided Vacancy',
        'type' => 'Care Provided Vacancy',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];
