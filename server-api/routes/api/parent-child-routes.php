<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-children-list-parent', 'ParentChildController@get')
        ->middleware('permission:parent-home')
        ->name('get-children-parent');

    Route::get('/get-child-info-parent', 'ParentChildController@view')
        ->middleware('permission:parent-home')
        ->name('get-child-details-parent');

    Route::get('/get-child-balance', 'ParentChildController@getParentDashboardBalance')
        ->middleware('permission:parent-home')
        ->name('get-balance');

    Route::get('/get-daily-child-payments', 'ParentChildController@getParentDashboardPayment')
        ->middleware('permission:parent-home')
        ->name('get-daily-payments');

    Route::get('/get-daily-child-bookings', 'ParentChildController@getParentDashboardBookings')
        ->middleware('permission:parent-home')
        ->name('get-daily-bookings');

    Route::get('/get-child-ytd', 'ParentChildController@getParentDashboardYTD')
        ->middleware('permission:parent-home')
        ->name('get-child-ytd');

    Route::get('get-child-allergy-types-parent','AllergiesController@getAllergyTypesParent')
        ->middleware('permission:parent-home')
        ->name('get-child-allergy-types-parent');

    Route::post('/accept-cwa', 'ParentChildController@acceptCWA')
        ->middleware('permission:parent-home')
        ->name('accept-cwa');

    Route::post('/update-child-parent-login', 'ParentChildController@updateChild')
        ->middleware('permission:parent-home')
        ->name('update-child-parent-login');

    Route::post('/child-health-medical-update-parent-login', 'ParentChildController@updateHealthMedical')
        ->middleware('permission:parent-home')
        ->name('child-health-medical-update-parent-login');

    Route::post('/child-allergy-store-parent', 'AllergiesController@storeParent')
        ->middleware('permission:parent-home')
        ->name('child-allergy-update-parent');

    Route::post('/child-allergy-update-parent', 'AllergiesController@updateParent')
        ->middleware('permission:parent-home')
        ->name('child-allergy-update-parent');

    Route::delete('/delete-allergy-parent', 'AllergiesController@deleteParent')
        ->middleware('permission:parent-home')
        ->name('delete-allergy-parent');


});
