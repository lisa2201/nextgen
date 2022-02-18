<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'buslist-access',
        'display_name' => 'View Bus List',
        'description' => 'View Bus List and Bus List Reports',
        'type' => 'Bus List',
        'navigation_ref_id' => 'N59',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'buslist-create',
        'display_name' => 'Create Bus List',
        'description' => 'Create New Busses/Schools',
        'type' => 'Bus List',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'buslist-edit',
        'display_name' => 'Edit Busses/Schools',
        'description' => 'Edit Busses/Schools',
        'type' => 'Bus List',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'buslist-delete',
        'display_name' => 'Delete Busses/Schools',
        'description' => 'Delete Busses/Schools',
        'type' => 'Bus List',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];
