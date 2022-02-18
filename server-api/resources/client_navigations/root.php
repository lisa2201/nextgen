<?php

return [
    [
        'id' => 'N01',
        'title' => 'Dashboard',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/web-hosting/svg/021-speedometer.svg',
        'url' => '/dashboard',
    ],
    [
        'id' => 'N08',
        'title' => 'Subscription Codes',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/003-support.svg',
        'url' => '/manage-subscription-codes',
    ],
    [
        'id' => 'N02',
        'title' => 'Subscribers',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/017-tasks-2.svg',
        'url' => '/manage-subscription',
    ],
    [
        'id' => 'N06',
        'title' => 'Permissions',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/permission.svg',
        'url' => '/manage-permissions',
    ],
    [
        'id' => 'N00',
        'title' => 'Data Migrations',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/ui_set/custom_icons/migration.svg',
        'children' => [
            [
                'id' => 'N54',
                'title' => 'CCS Enrolments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/enrollment.svg',
                'url' => '/import-enrollments',
            ],
            [
                'id' => 'N56',
                'title' => 'Bookings',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/bookings.svg',
                'url' => '/import-bookings',
            ],
            [
                'id' => 'N55',
                'title' => 'Parents',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/family.svg',
                'url' => '/import-parents',
            ],
            [
                'id' => 'N55',
                'title' => 'Educators',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/employees.svg',
                'url' => '/import-educators',
            ],
            [
                'id' => 'N60',
                'title' => 'Immunisation',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/immune-system.svg',
                'url' => '/manage-immunisation',
            ],
        ]
    ],

    [
        'id' => 'N00',
        'title' => 'Bulk Operation',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/ui_set/concentration/svg/022-monitor.svg',
        'children' => [
            [
                'id' => 'N55',
                'title' => 'SNS',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/concentration/svg/011-planning.svg',
                'url' => '/bulk-sns',
            ],
        ]
    ],
    [
        'id' => 'N17',
        'title' => 'Settings',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/014-settings.svg',
        'url' => '/settings',
    ],
    [
        'id' => 'N00',
        'title' => 'Server Logs',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/logs.svg',
        'url' => '/server-logs',
    ],
];
