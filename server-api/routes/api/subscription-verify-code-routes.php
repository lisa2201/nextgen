<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-sub-codes', 'SubscriptionVerifyCodeController@get')
        ->middleware('permission:subscription-code-access')
        ->name('get-sub-codes');

    Route::get('/get-sub-code', 'SubscriptionVerifyCodeController@getCode')
        ->middleware('permission:subscription-code-access')
        ->name('get-sub-code');

    Route::get('/sub-email-exists', 'SubscriptionVerifyCodeController@emailExists')
        ->middleware('permission:subscription-code-access')
        ->name('sub-code-email-exists');

    /* post routes */
    Route::post('/create-sub-codes', 'SubscriptionVerifyCodeController@create')
        ->middleware('permission:subscription-code-create')
        ->name('create-sub-codes');

    Route::post('/update-sub-codes', 'SubscriptionVerifyCodeController@update')
        ->middleware('permission:subscription-code-edit')
        ->name('update-sub-codes');

    Route::delete('/delete-sub-codes', 'SubscriptionVerifyCodeController@delete')
        ->middleware('permission:subscription-code-delete')
        ->name('delete-sub-codes');
});