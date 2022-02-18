<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-children-list', 'ChildController@list')
        ->middleware('permission:child-access')
        ->name('get-children');

    Route::get('/get-children', 'ChildController@get')
        ->middleware('permission:child-access')
        ->name('get-all-children');

    Route::get('/children-data', 'ChildController@getDependency')
        ->middleware('permission:child-access')
        ->name('get-child-dependency');

    Route::get('/get-child-info', 'ChildController@edit')
        ->name('get-child-details');

    Route::get('/get-child-documents', 'ChildController@getDocuments')
        ->name('get-child-documents');

    Route::get('/get-children-by-branch', 'ChildController@findByBranch')
        ->middleware('permission:child-access')
        ->name('get-children-by-branch');

    Route::get('/send-bulk-sns-child', 'ChildController@sendBulkSNS')
        ->middleware('permission:child-access')
        ->name('send-bulk-sns-child');

    Route::get('/find-by-id-short-data', 'ChildController@findByIdShort')
        ->middleware('permission:child-access')
        ->name('find-by-id-short-data');

    Route::post('/update-child-consent', 'ChildController@updateConsents')
        ->middleware('permission:child-access')
        ->name('update-child-consent');

    /* post routes */

    Route::post('/update-child-documents', 'ChildController@updateDocuments')
        ->name('update-child-documents');

    Route::post('/create-child', 'ChildController@create')
        ->middleware('permission:child-create')
        ->name('create-child');

    Route::post('/update-child', 'ChildController@update')
        ->middleware('permission:child-edit')
        ->name('update-child');

    Route::post('/add-bus-for-child', 'ChildController@addBusForChild')
        ->middleware('permission:child-edit')
        ->name('update-child');

    Route::post('/delete-bus-from-child', 'ChildController@deleteBusFromChild')
        ->middleware('permission:child-edit')
        ->name('update-child');

    Route::post('/update-child-room', 'ChildController@updateRoom')
        ->middleware('permission:child-edit')
        ->name('attach-room-to-child');

    Route::post('/update-child-user', 'ChildController@updateUser')
        ->middleware('permission:child-edit')
        ->name('attach-user-to-child');

    Route::post('/set-primary-payer', 'ChildController@setPrimaryPayer')
        ->middleware('permission:child-edit')
        ->name('set-primary-payer');

    Route::delete('/delete-child', 'ChildController@delete')
        ->middleware('permission:child-delete')
        ->name('delete-child');

    Route::post('/update-child-tracking-value', 'ChildController@updateTrackingValue')
        ->middleware('permission:child-edit')
        ->name('update-child-tracking-value');


});
