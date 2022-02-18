<?php

return [

    'EZIDEBIT'=> [
        'EZIDEBIT_PUBLIC_KEY' => '1DEA3B09-33CF-4FD1-3FFE-C47AD3A1A151',
        'EZIDEBIT_DIGITAL_KEY' => '99340EA9-2806-4112-925D-D3C870A53607',
        'PCI_URL' => 'https://api.ezidebit.com.au/v3-5/pci?singleWsdl',
        'NON_PCI_URL' => 'https://api.ezidebit.com.au/v3-5/nonpci?singleWsdl',
        'EDDR_URL' => 'https://secure.ezidebit.com.au/webddr/Request.aspx'
    ],
    'EZIDEBIT_DEV' => [
        'EZIDEBIT_PUBLIC_KEY' => '9C2D80D8-8955-481B-B25A-C2AEC64568D5',
        'EZIDEBIT_DIGITAL_KEY' => '4305B86D-1C57-4EF3-D325-0751E5D30B61',
        'PCI_URL' => 'https://api.demo.ezidebit.com.au/v3-5/pci?singleWsdl',
        'NON_PCI_URL' => 'https://api.demo.ezidebit.com.au/v3-5/nonpci?singleWsdl',
        'EDDR_URL' => 'https://demo.ezidebit.com.au/webddr/Request.aspx'
    ],
    'STRIPE' => [
        'STRIPE_PUBLIC_KEY' => 'pk_test_bcRDgBcFTBB7sLF13VUSCJ34',
        'STRIPE_PRIVATE_KEY' => 'sk_test_aPilxHJni2wqiKVGjfZmjWy7',
    ],
    'STRIPE_DEV' => [
        'STRIPE_PUBLIC_KEY' => 'pk_test_bcRDgBcFTBB7sLF13VUSCJ34',
        'STRIPE_PRIVATE_KEY' => 'sk_test_aPilxHJni2wqiKVGjfZmjWy7',
    ]
];
