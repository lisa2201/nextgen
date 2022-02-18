<?php

// verify email
Route::post('/auth_verify_email', 'SubscriptionsController@verifySubscriptionEmail')->name('client-subscription-email-verify');

// resend verification email
Route::post('/resend_auth_verify_email', 'SubscriptionsController@resendVerifyEmail')->name('resent-client-subscription-email-verify');

// register new subscription [organization]
Route::post('/auth_register', 'SubscriptionsController@subscribeUserAccount')->name('client-subscription');

Route::group(['middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-subscription-info', 'SubscriptionsController@checkSubscriptionData')->name('get-subscription-info');
});

//Authenticated routes
Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-subscription-list', 'SubscriptionsController@get')
        ->middleware('permission:subscription-access')
        ->name('get-subscriptions');

    Route::get('/dataset-subscriptions', 'SubscriptionsController@dataTable')
        ->middleware('permission:subscription-access')
        ->name('get-datatable-subscriptions');

    Route::get('/get-subscription-details', 'SubscriptionsController@view')
        ->middleware('permission:subscription-access')
        ->name('view-subscription');

    Route::get('/get-subscription-info', 'SubscriptionsController@view')
        ->name('get-subscription-info');

    /* post routes */
    Route::post('/approve-subscription', 'SubscriptionsController@approve')
        ->middleware('permission:subscription-approve')
        ->name('approve-subscriptions');

    Route::delete('/reject-subscription', 'SubscriptionsController@disapprove')
        ->middleware('permission:subscription-disapprove')
        ->name('disapprove-subscriptions');
});
