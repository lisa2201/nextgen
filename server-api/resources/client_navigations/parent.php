<?php

return [
    [
        'id' => 'N11',
        'title' => 'Home',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/282103-user-interface/svg/house.svg',
        'url' => '/home',
    ],
    [
        'id' => 'N11',
        'title' => 'Children',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/ui_set/custom_icons/children.svg',
        'url' => '/children',
    ],
    [
        'id' => 'N34',
        'title' => 'Payments',
        'translate' => '',
        'type' => 'collapsable',
        'image' => 'assets/icons/flat/icons1/svg/014-bank-1.svg',
        'children' => [
            [
                'id'   => 'N44',
                'title' => 'Auto Debit Setup',
                'type' => 'item',
                'image' => 'assets/icons/flat/icons1/svg/035-bank.svg',
                'url'  => '/finance/finance-payment-methods'
            ],
            [
                'id'   => 'N36',
                'title' => 'Statements',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/business-situations/svg/analytics.svg',
                'url'  => '/finance/financial-statements'
            ],
            [
                'id'   => 'N43',
                'title' => 'Payments',
                'type' => 'item',
                'image' => 'assets/icons/flat/ui_set/marketing-seo/svg/032-payment.svg',
                'url'  => '/finance/finance-account-payments'
            ],
            [
                'id'   => 'N46',
                'title' => 'Account Transactions',
                'image' => 'assets/icons/flat/ui_set/stock-market/svg/003-trade.svg',
                'type' => 'item',
                'url'  => '/finance/finance-account-transactions'
            ]
        ]
    ],
    [
        'id' => 'N30',
        'title' => 'Emergency Contacts',
        'translate' => '',
        'type' => 'item',
        'image' => 'assets/icons/flat/business-and-office/svg/030-team.svg',
        'url' => '/emergency-contacts',
    ]
];
