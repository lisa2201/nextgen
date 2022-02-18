<?php

use Kinderm8\CcsSetup;

if(CcsSetup::where('organization_id',auth()->user()->organization_id)->get()->first())
{
    $ccsNavs = [
        'id' => 'N00',
        'title' => 'CCS Management',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/401529-knowledge/svg/045-memory.svg',
        'children' => [
            [
                'id' => 'N22',
                'title' => 'CCS-setup',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/computer-technology/svg/010-monitor.svg',
                'url' => '/ccs-setup',
            ],
            [
                'id' => 'N22',
                'title' => 'CCS-notification',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/concentration/svg/024-alarm-clock.svg',
                'url' => '/ccs-notification',
            ],
            [
                'id' => 'N20',
                'title' => 'Account Management',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/account-manager.svg',
                'url' => '/account-manager',
            ],
            [
                'id' => 'N38',
                'title' => 'Debt Management',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/business-and-office/svg/031-debt.svg',
                'url' => '/manage-debt',
            ],
            [
                'id' => 'N23',
                'title' => 'CCS Entitlement Variation',
                'translate' => '',
                'type' => 'hidden',
                'image' => 'assets/icons/flat/ui_set/custom_icons/money.svg',
                'url' => '/bulk-operations/ccs-entitlement-variation',
            ],
        ]
    ];
    $ccmsNavs = [
        'id' => 'N00',
        'title' => 'CCMS Operation',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/ui_set/custom_icons/content-management-system.svg',
        'children' => [
            [
                'id' => 'N48',
                'title' => 'CCMS Connections',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/elearning.svg',
                'url' => '/ccms-connection',
            ],
            [
                'id' => 'N48',
                'title' => 'Innovative Solutions Cases',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/strategy-and-management/svg/022-idea.svg',
                'url' => '/innovative-solution-cases',
            ],
            [
                'id' => 'N48',
                'title' => 'Message',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/email.svg',
                'url' => '/manage-message',
            ],
            [
                'id' => 'N48',
                'title' => 'Query Payments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/blog/svg/046-browser-1.svg',
                'url' => '/query-payments',
            ],


        ]
    ];
}
else
{
    $ccsNavs = null;
    $ccmsNavs = null;
}

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
        'id' => 'N03',
        'title' => 'Branches',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/navigation-maps/svg/location4.svg',
        'url' => '/manage-branches',
    ],
    [
        'id' => 'N05',
        'title' => 'Roles',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/010-team-3.svg',
        'url' => '/manage-roles',
    ],
    [
        'id' => 'N04',
        'title' => 'Users',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/030-team.svg',
        'url' => '/manage-users',
    ],
    [
        'id' => 'N26',
        'title' => 'CRM',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/401529-knowledge/svg/045-memory.svg',
        'children' => [
            [
                'id' => 'N26',
                'title' => 'Dashboard',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/waiting-lists.svg',
                'url' => '/manage-waitlist',
            ],
            [
                'id' => 'N57',
                'title' => 'Form Configuration',
                'translate' => '',
                'type' => 'collapsable',
                'image' => 'assets/icons/flat/401529-knowledge/svg/017-education.svg',
                'children' => [
                    [
                        'id' => 'N57',
                        'title' => 'Enquiry Form',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/employment/svg/032-phone-call.svg',
                        'url' => '/master/enquiry',
                    ],
                    [
                        'id' => 'N57',
                        'title' => 'Waitlist',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/employment/svg/016-contract.svg',
                        'url' => '/master/waitlist',
                    ],
                    [
                        'id' => 'N57',
                        'title' => 'Enrolment Form',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/employment/svg/005-contract-2.svg',
                        'url' => '/master/enrollment',
                    ],
                ]
            ]
        ],
    ],
    [
        'id' => 'N00',
        'title' => 'Subscriber Payments',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/icons1/svg/012-money-exchange.svg',
        'children' => [
            [
                'id'   => 'N15',
                'title' => 'Payment Methods',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/credit-card.svg',
                'url'  => '/manage-payment/payment-methods'
            ],
            [
                'id'   => 'N13',
                'title' => 'Invoices',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/bill.svg',
                'url'  => '/manage-payment/invoices'
            ],
            [
                'id'   => 'N14',
                'title' => 'Payment History',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/history.svg',
                'url'  => '/manage-payment/payment-histories'
            ],
            [
                'id'   => 'N15',
                'hidden' => true,
                'title' => 'Payment Startup',
                'type' => 'item',
                'url'  => '/payment-startup'
            ]
        ]
    ],
    [
        'id' => 'N00',
        'title' => 'Parent Payments',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/svgset_5/svg/payment-method.svg',
        'children' => [
            [
                'id'   => 'N15',
                'title' => 'Payment Providers',
                'type' => 'item',
                'image' => 'assets/icons/flat/icons1/svg/022-document.svg',
                'url'  => '/manage-parent-payment/providers'
            ],
            // [
            //     'id'   => 'N13',
            //     'title' => 'Invoices',
            //     'type' => 'item',
            //     'image' => 'assets/icons/flat/svgset_5/svg/bank.svg',
            //     'url'  => '/manage-parent-payment/invoices'
            // ],
            // [
            //     'id'   => 'N14',
            //     'title' => 'Payment History',
            //     'type' => 'item',
            //     'url'  => '/manage-payment/payment-histories'
            // ],
            // [
            //     'id'   => 'N15',
            //     'hidden' => true,
            //     'title' => 'Payment Startup',
            //     'type' => 'item',
            //     'url'  => '/payment-startup'
            // ]
        ]
    ],
    [
        'id' => 'N09',
        'title' => 'Invitations',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/invitation2.svg',
        'url' => '/manage-invitations',
    ],
    $ccsNavs,

    $ccmsNavs,

    [
        'id' => 'N17',
        'title' => 'Settings',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/business-and-office/svg/014-settings.svg',
        'children' => [
            [
                'id' => 'N60',
                'title' => 'Immunisation',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/immune-system.svg',
                'url' => '/manage-immunisation',
            ]

        ]
    ],
];
