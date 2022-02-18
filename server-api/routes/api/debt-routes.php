<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
    Route::get('/get-alternatve-payments', 'DebtController@getApa')
        ->middleware('permission:alternative-payment-arrangement-access')
        ->name('get-alternatve-payments');

    Route::get('/get-debt-list', 'DebtController@get')
        ->middleware('permission:debt-management-access')
        ->name('get-debt-list');

    /* post routes */
    Route::post('/create-altrenative-payment', 'DebtController@create')
        ->middleware('permission:alternative-payment-arrangement-create')
        ->name('create-altrenative-payment');

    Route::post('/edit-altrenative-payment', 'DebtController@update')
        ->middleware('permission:alternative-payment-arrangement-edit')
        ->name('edit-altrenative-payment');

        
    Route::post('/upload-altrenative-payment-doc', 'DebtController@documentUpload')
    ->middleware('permission:alternative-payment-arrangement-edit')
    ->name('edit-altrenative-payment');
});
