<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-bond-payment-list', 'BondPaymentController@get')
        ->middleware('permission:bond-payment-access')
        ->name('get-bond-payment-list');

    /* post routes */
    Route::post('/create-bond-payment', 'BondPaymentController@store')
    ->middleware('permission:bond-payment-access')
    ->name('create-bond-payment');

    Route::post('/update-bond-payment', 'BondPaymentController@update')
    ->middleware('permission:bond-payment-access')
    ->name('update-bond-payment');


    Route::delete('/delete-bond-payment', 'BondPaymentController@delete')
        ->middleware('permission:bond-payment-access')
        ->name('delete-bond-payment');


});
