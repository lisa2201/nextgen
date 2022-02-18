<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-immunisation-list', 'ImmunisationController@get')
        ->middleware('permission:immunisation-access')
        ->name('get-immunisation-list');

    Route::get('/get-immunisation', 'ImmunisationController@getAll')
        ->name('get-immunisation');

    //tracking routes
    Route::get('/get-immunisation-tracker', 'ImmunisationController@getTracker')
        ->middleware('permission:immunisation-access')
        ->name('get-immunisation-tracker');

    Route::get('/get-all-immunisation-tracker', 'ImmunisationController@getAllTracker')
        ->name('get-all-immunisation-tracker');

        Route::get('/get-all-immunisation-schedule', 'ImmunisationController@getAllSchedule')
        ->name('get-all-immunisation-schedule');



    /* post routes */
    Route::post('/create-immunisation', 'ImmunisationController@create')
        ->middleware('permission:immunisation-create')
        ->name('create-immunisation');

    Route::post('/update-immunisation-status', 'ImmunisationController@updateStatus')
        ->middleware('permission:immunisation-edit')
        ->name('update-immunisation-status');

    Route::post('/update-immunisation', 'ImmunisationController@update')
        ->middleware('permission:immunisation-edit')
        ->name('update-immunisation');

    Route::delete('/delete-immunisation', 'ImmunisationController@delete')
        ->middleware('permission:immunisation-delete')
        ->name('delete-immunisation');

    // tracking routes
    Route::post('/create-single-immunisation-tracker', 'ImmunisationController@createSingleTracker')
        ->middleware('permission:immunisation-access')
        ->name('create-single-immunisation-tracker');

    Route::post('/update-single-immunisation-tracker', 'ImmunisationController@updateSingleTracker')
        ->middleware('permission:immunisation-access')
        ->name('update-single-immunisation-tracker');


    Route::post('/import-immunisation', 'ImmunisationController@import')
        ->middleware('permission:immunisation-create')
        ->name('import-immunisation');

    Route::post('/bulk-update-immunisation-tracker-by-child', 'ImmunisationController@updateBulkTrackerByChild')
        ->middleware('permission:immunisation-access')
        ->name('bulk-update-immunisation-tracker-by-child');

    Route::post('/bulk-update-immunisation-tracker', 'ImmunisationController@updateBulkTracker')
        ->middleware('permission:immunisation-access')
        ->name('bulk-update-immunisation-tracker');

    Route::post('/bulk-delete-immunisation-tracker-by-child', 'ImmunisationController@deleteBulkTrackerByChild')
        ->middleware('permission:immunisation-access')
        ->name('bulk-delete-immunisation-tracker-by-child');

    Route::delete('/delete-immunisation-tracker', 'ImmunisationController@deleteTracker')
        ->middleware('permission:immunisation-access')
        ->name('delete-immunisation-tracker');









});
