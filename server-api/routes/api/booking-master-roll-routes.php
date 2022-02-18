<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-master-roll-list', 'BookingMasterRollController@get')
        ->middleware('permission:booking-access')
        ->name('get-master-roll-bookings');

    Route::get('/master-roll-data', 'BookingMasterRollController@getDependency')
        ->middleware('permission:booking-create')
        ->name('get-master-roll-dependency');

    Route::get('/get-master-roll-occupancy', 'BookingMasterRollController@getOccupancy')
        ->middleware('permission:booking-access')
        ->name('get-master-roll-occupancy');

    /* post routes */
    Route::post('/master-roll-preview', 'BookingMasterRollController@previewSlots')
        ->middleware('permission:booking-create')
        ->name('get-master-roll-preview-booking-slots');

    Route::post('/master-roll-manage-preview', 'BookingMasterRollController@manageBookingsPreviewSlots')
        ->middleware('permission:booking-edit|booking-delete')
        ->name('master-roll-manage-bookings-preview-slots');

    Route::post('/create-master-roll-bookings', 'BookingMasterRollController@create')
        ->middleware('permission:booking-create')
        ->name('create-master-roll-bookings');

    Route::post('/manage-master-roll-bookings', 'BookingMasterRollController@update')
        ->middleware('permission:booking-edit')
        ->name('update-master-roll-bookings');
});
