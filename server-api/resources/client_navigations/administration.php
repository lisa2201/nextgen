<?php

use Kinderm8\CcsSetup;

if(CcsSetup::where('organization_id', auth()->user()->organization_id)->get()->first())
{
    $ccsNavs = [
        'id' => 'N00',
        'title' => 'CCS Operations',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/401529-knowledge/svg/045-memory.svg',
        'children' => [
            [
                'id' => 'N33',
                'title' => 'Session Submission',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/interview/svg/021-resume-1.svg',
                'url' => '/bulk-operations/session-submissions',
            ],
            [
                'id' => 'N22',
                'title' => 'CCS Notification',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/concentration/svg/024-alarm-clock.svg',
                'url' => '/ccs-notification',
            ],
            [
                'id' => 'N32',
                'title' => 'Care provided & Vacancy',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/concentration/svg/030-search.svg',
                'url' => '/care-provided-and-vacancy',
            ],
            [
                'id' => 'N20',
                'title' => 'Account Management',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/account-manager.svg',
                'url' => '/account-manager-branch',
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
                'id' => 'N00',
                'title' => 'Bulk Reporting',
                'translate' => '',
                'type' => 'collapsable',
                'image' => 'assets/icons/flat/ui_set/custom_icons/batch.svg',
                'children' => [
                    /*[
                        'id' => 'N23',
                        'title' => 'Enrolment',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/svgset_5/svg/017-interview.svg',
                        'url' => '/bulk-operations/enrolment',
                    ],*/
                    [
                        'id' => 'N23',
                        'title' => 'Entitlement',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/customer-service/svg/discount.svg',
                        'url' => '/bulk-operations/entitlements',
                    ],
                    [
                        'id' => 'N33',
                        'title' => 'Session Reports',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/interview/svg/041-profiles.svg',
                        'url' => '/bulk-operations/session-reports',
                    ],
                    [
                        'id' => 'N33',
                        'title' => 'Session Subsidy',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/custom_icons/hearth.svg',
                        'url' => '/bulk-operations/session-subsidy',
                    ],
                    [
                        'id' => 'N22',
                        'title' => 'CCS Payments',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/custom_icons/money.svg',
                        'url' => '/bulk-operations/ccs-payments',
                    ],
                    [
                        'id' => 'N23',
                        'title' => 'CCS Entitlement Variation',
                        'translate' => '',
                        'type' => 'item',
                        'image' => 'assets/icons/flat/ui_set/custom_icons/money.svg',
                        'url' => '/bulk-operations/ccs-entitlement-variation',
                    ],
                ]
            ],
            /*[
                'id' => 'N48',
                'title' => 'Sessions Submissions',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/blog/svg/046-browser-1.svg',
                'url' => '/session-submissions',
            ]*/
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
                'title' => 'Inclusion Support Cases',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/volunteer.svg',
                'url' => '/inclusion-support/cases',
            ],
            [
                'id' => 'N48',
                'title' => 'Inclusion Support Claims',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/volunteer.svg',
                'url' => '/inclusion-support/claims',
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
                'title' => 'Innovative Solutions Claims',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/strategy-and-management/svg/022-idea.svg',
                'url' => '/innovative-solution-cases-claims',
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
                'title' => 'Query Remittance',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/blog/svg/046-browser-1.svg',
                'url' => '/query-remittance',
            ],
            [
                'id' => 'N48',
                'title' => 'Query Payments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/blog/svg/046-browser-1.svg',
                'url' => '/query-payments',
            ]
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
    /*[
        'id' => 'N04',
        'title' => 'Staffs' . LocalizationHelper::getTranslatedText('response.success_request'),
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/employees.svg',
        'url' => '/manage-users',
    ],
    [
        'id' => 'N04',
        'title' => 'Parents',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/family.svg',
        'url' => '/manage-users',
    ],*/
    [
        'id' => 'N00',
        'title' => 'User Management',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/business-and-office/svg/030-team.svg',
        'children' => [
            [
                'id' => 'N04',
                'title' => 'Staff',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/employees.svg',
                'url' => '/manage-staffs',
            ],
            [
                'id' => 'N04',
                'title' => 'Parents',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/family.svg',
                'url' => '/manage-parents',
            ]
        ]
    ],
    [
        'id' => 'N07',
        'title' => 'Children',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/children.svg',
        'url' => '/manage-children',
    ],
    [
        'id' => 'N25',
        'title' => 'Master Roll',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/master-roll.svg',
        'url' => '/manage-master-roll',
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
        'id' => 'N21',
        'title' => 'Rooms',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/house.svg',
        'url' => '/manage-rooms',
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
        'id' => 'N71',
        'title' => 'Staff Incident Form',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/waiting-lists.svg',
        'url' => '/staff-incident',
    ],
    [
        'id' => 'N00',
        'title' => 'Financial',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/ui_set/stock-market/svg/011-save.svg',
        'children' => [
            [
                'id' => 'N40',
                'title' => 'Parent Accounts',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/business-and-office/svg/016-files.svg',
                'url' => '/finance/finance-accounts',
            ],
            [
                'id' => 'N46',
                'title' => 'Account Transactions',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/stock-market/svg/003-trade.svg',
                'url' => '/finance/finance-account-transactions',
            ],
            [
                'id' => 'N43',
                'title' => 'Parent Payments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/marketing-seo/svg/032-payment.svg',
                'url' => '/finance/finance-account-payments',
            ],
            [
                'id' => 'N36',
                'title' => 'Statements',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/business-situations/svg/analytics.svg',
                'url' => '/finance/financial-statements',
            ],
            [
                'id' => 'N27',
                'title' => 'Financial Adjustments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/stock-market/svg/008-control.svg',
                'url' => '/finance/financial-adjustments',
            ],
            [
                'id' => 'N35',
                'title' => 'Opening Balance',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/communication-and-media/svg/levels.svg',
                'url' => '/finance/balance-adjustments',
            ],
            [
                'id' => 'N50',
                'title' => 'Bond payments',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/marketing-seo/svg/074-clipboard.svg',
                'url' => '/finance/bond-payments',
            ],
            [
                'id' => 'N61',
                'title' => 'Payment Terms',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/stock-market/svg/payment-day.svg',
                'url' => '/finance/payment-terms',
            ],
            [
                'id' => 'N63',
                'title' => 'Petty cash',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/stock-market/svg/013-portfolio.svg',
                'url' => '/finance/petty-cash',
            ],
        ]
    ],
    [
        'id' => 'N52',
        'title' => 'Report Builder',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/ui_set/concentration/svg/009-clipboard.svg',
        'children' => [
            [
                'id' => 'N52',
                'title' => 'Attendance Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/calendar.svg',
                'url' => '/manage-reports/attendance',
            ],

            [
                'id' => 'N59',
                'title' => 'Bus List Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/playground/svg/009-bus.svg',
                'url' => '/manage-reports/buslist',
            ],

            [
                'id' => 'N52',
                'title' => 'Contact Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/e-call.svg',
                'url' => '/manage-reports/contact',
            ],

            [
                'id' => 'N52',
                'title' => 'Financial Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/marketing-seo/svg/054-wallet.svg',
                'url' => '/manage-reports/financial',
            ],
            [
                'id' => 'N52',
                'title' => 'CCS/CCMS Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/execution.svg',
                'url' => '/manage-reports/ccms-report',
            ],
            [
                'id' => 'N52',
                'title' => 'Medical Reports',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/medical.svg',
                'url' => '/manage-reports/medical-report',
            ]
        ]
    ],
    [
        'id' => 'N00',
        'title' => 'Settings',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/business-and-office/svg/014-settings.svg',
        'children' => [
            [
                'id' => 'N24',
                'title' => 'Fees',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/icons1/svg/014-bank-1.svg',
                'url' => '/manage-fees',
            ],
            [
                'id' => 'N41',
                'title' => 'Service Settings',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/branch/service-settings.svg',
                'url' => '/service-settings',
            ],
            [
                'id' => 'N53',
                'title' => 'Centre Settings',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/branch/center-settings.svg',
                'url' => '/centre-settings',
            ],
            [
                'id' => 'N60',
                'title' => 'Immunisation',
                'translate' => '',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/custom_icons/child/immune-system.svg',
                'url' => '/manage-immunisation',
            ]
        ]
    ]
];
