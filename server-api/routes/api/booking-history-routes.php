<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-booking-history', 'BookingHistoryController@get')
        ->middleware('permission:booking-access')
        ->name('get-booking-history-list');

    Route::get('/booking-history-data', 'BookingHistoryController@getDependency')
        ->middleware('permission:booking-access')
        ->name('get-booking-history-dependency');

    /* post routes */
//    Route::post('/get-booking-preview', 'BookingHistoryController@previewSlots')
//        ->middleware('permission:booking-create')
//        ->name('get-preview-booking-slots');
});
