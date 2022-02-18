<?php

/*header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Authorization, Cookie, DNT, Origin, User-Agent, X-Requested-With, Refresh-Token, Auth-Client, Content-Type, Content-Length, Content-Language, Client, Client-Ref');
header('Access-Control-Allow-Origin: *');*/

// login path for all users
Route::post('/login', 'PassportController@login')->name('passport-user-login');

// login to kinder pay
Route::post('/verify_kinder_connect_access', 'PassportController@kinderPayLogin')->name('login-to-kinder-pay');

// password forgot
Route::post('/forgot-password','PassportController@forgot')->name('forgot-password');

// password reset
Route::get('/verify_reset_token','PassportController@resetVerify')->name('verify-reset-password-token');
Route::post('/reset-password','PassportController@reset')->name('reset-password');

//Authenticated routes
Route::group(['middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/auth_user', 'PassportController@getUser')->name('passport-get-user-info');

    Route::get('/logout', 'PassportController@logout')->name('passport-user-logout');

    Route::get('/access-kinder-connect', 'PassportController@kinderConnectLogin')->name('login-to-kinder-connect');

    Route::get('/get-subscriber-branch-access', 'PassportController@getBranchAccessLinks')->name('get-branch-access-links');
    Route::get('/get-kinder-pay-access', 'PassportController@kinderPayAccess')->name('get-kinder-pay-login-access');

    Route::get('/sync-kc-profile', 'PassportController@syncKinderConnectProfile')->name('sync-kinder-connect-profile');

    /* post routes */
    Route::post('/reset-user-password','PassportController@resetPassword')->name('reset-password');
});
