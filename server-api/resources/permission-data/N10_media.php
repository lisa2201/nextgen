<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'media-access',
        'display_name' => 'Display Media Content',
        'description' => 'View all media files',
        'type' => 'Media',
        'navigation_ref_id' => 'N10',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'media-upload',
        'display_name' => 'Upload Media Content',
        'description' => 'Upload media files',
        'type' => 'Media',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_UPLOAD
    ],
    [
        'name' => 'media-edit',
        'display_name' => 'Edit Media Content',
        'description' => 'Edit media files',
        'type' => 'Media',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'media-delete',
        'display_name' => 'Delete Media Content',
        'description' => 'Delete media files',
        'type' => 'Media',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];
