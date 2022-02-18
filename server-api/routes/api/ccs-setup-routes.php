<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::post('/create-ccs', 'CcsSetupController@store')
        ->middleware('permission:ccs_setup-create')
        ->name('ccs_setup-create');

    Route::get('/get-ccs-list', 'CcsSetupController@list')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');

    Route::get('/get-ccs', 'CcsSetupController@get')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-get');

    Route::get('/get-ccs-info', 'CcsSetupController@edit')
        ->middleware('permission:ccs_setup-access')
        ->name('get-ccs-details');

    Route::post('/update-ccs', 'CcsSetupController@update')
        ->middleware('permission:ccs_setup-refresh')
        ->name('update-ccs-status');

    //  ccs message routes
    Route::get('/get-message-list', 'CcsSetupController@getMessageList')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');
    Route::get('/get-ccs-entitlement-history', 'CcsSetupController@entitlementHistory')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');
    Route::get('/get-ccs-notification-dashboard', 'CcsSetupController@ccsNotificationDashboard')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');

    // get-correspondece-list
    Route::get('/get-correspondece-list', 'CcsSetupController@getCorrespondeceList')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');

    Route::get('/get-correspondence', 'CcsSetupController@getCorrespondece')
        ->middleware('permission:ccs_setup-access')
        ->name('ccs_setup-access');

});
