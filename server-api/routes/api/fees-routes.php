<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-list-fees', 'FeesController@get')
        ->middleware('permission:fees-access')
        ->name('get-fees');

    Route::get('/fee-data', 'FeesController@getDependency')
        ->middleware('permission:fees-access')
        ->name('get-fee-dependency');

    Route::get('/get-fee-info', 'FeesController@edit')
        ->middleware('permission:fees-access')
        ->name('get-fee-details');

    Route::get('/adjusted-list', 'FeesController@getAdjustedList')
        ->middleware('permission:fees-access')
        ->name('get-adjusted-fees');

    /* post routes */
    Route::post('/store-fees', 'FeesController@store')
        ->middleware('permission:fees-create')
        ->name('store-fees');

    Route::post('/update-fees', 'FeesController@update')
        ->middleware('permission:fees-edit')
        ->name('update-fees');

    Route::post('/update-fees-status', 'FeesController@updateStatus')
        ->middleware('permission:fees-edit')
        ->name('update-fees-status');

    Route::delete('/delete-fees', 'FeesController@delete')
        ->middleware('permission:fees-delete')
        ->name('delete-fees');

    Route::post('/adjust-fees', 'FeesController@adjust')
        ->middleware('permission:fees-edit')
        ->name('store-adjust-fees');

    Route::delete('/delete-adjusted-fee', 'FeesController@deleteAdjusted')
        ->middleware('permission:fees-edit')
        ->name('delete-adjusted-fees');
});
