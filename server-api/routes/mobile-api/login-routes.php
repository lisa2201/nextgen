<?php

    Route::get('/device-get-client-id', 'KioskController@deviceGetClientId');

    Route::get('/kc-get-client-id', 'KioskController@GetClientIdByDomain');

    Route::get('/device-get-client-by-mobile', 'KioskController@deviceGetClientByMobile');

    // login path with pincode
    Route::post('/device-pincode-login', 'PassportController@devicePincodeLogin')->name('device-passport-pincode-login');

    // login path with QR code data
    Route::post('/device-qr-login', 'PassportController@deviceQRCodeLogin')->name('device-passport-qr-login');

    // login path with user id
    Route::post('/device-user-id-login', 'PassportController@deviceUserIdLogin')->name('device-passport-user-id-login');

    Route::get('/device-create-parent-pincode', 'KioskController@deviceCreateParentPincode');

    //temporary route for xero
    Route::get('/xero-redirection', 'KioskController@xeroRedirect')->name('xero-redirection');

    Route::get('/get-client-by-mobile', 'KioskController@GetClientByMobile');

