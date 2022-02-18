<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-booking-list', 'BookingController@get')
        ->middleware('permission:booking-access')
        ->name('get-child-bookings');

    Route::get('/get-abs-reasons', 'BookingController@getAbsenceReasons')
        ->middleware('permission:booking-access')
        ->name('get-ccs-absence-reasons');

    Route::get('/get-booking-time-sheet', 'BookingController@getBookingForTimeSheet')
        ->middleware('permission:booking-access')
        ->name('get-booking-time-sheet');

    Route::get('/booking-data', 'BookingController@getDependency')
        ->middleware('permission:booking-create')
        ->name('get-booking-dependency');

    Route::get('/get-booking-info', 'BookingController@edit')
        ->middleware('permission:booking-edit')
        ->name('get-booking-details');

    Route::get('/get-dashboard-booking-info', 'BookingController@getDashboardUtilization')
        ->middleware('permission:booking-access')
        ->name('dashboard-booking-info');

    Route::get('/widget-get-booking-fees', 'BookingController@widgetGetBookingFees')
        ->middleware('permission:booking-access')
        ->name('widget-get-booking-fees');

    Route::get('/get-child-booking-history', 'BookingController@getHistory')
        ->middleware('permission:booking-access')
        ->name('get-child-booking-history');

    /* post routes */
    Route::post('/get-booking-preview', 'BookingController@previewSlots')
        ->middleware('permission:booking-create')
        ->name('get-preview-booking-slots');

    Route::post('/create-booking', 'BookingController@create')
        ->middleware('permission:booking-create')
        ->name('create-child-booking');

    Route::post('/create-single-booking', 'BookingController@createSingle')
        ->middleware('permission:booking-create')
        ->name('create-single-child-booking');

    Route::post('/update-single-booking', 'BookingController@updateSingle')
        ->middleware('permission:booking-edit')
        ->name('update-single-booking');

    Route::delete('/delete-booking', 'BookingController@delete')
        ->middleware('permission:booking-delete')
        ->name('delete-role');

    Route::post('/update-booking-type', 'BookingController@updateBookingType')
        ->middleware('permission:booking-edit')
        ->name('update-single-booking-type');

    Route::post('/manage-bookings-preview', 'BookingController@manageBookingsPreviewSlots')
        ->middleware('permission:booking-edit|booking-delete')
        ->name('manage-bookings-preview-slots');

    Route::post('/manage-bookings', 'BookingController@update')
        ->middleware('permission:booking-edit')
        ->name('update-bookings');

    Route::post('/get-bookings-bulk-attendance', 'BookingController@bulkBookingAttendancePreview')
        ->middleware('permission:booking-edit')
        ->name('get-booking-preview-bulk-attendance-update');

    Route::post('/update-bulk-attendance', 'BookingController@updateBulkAttendance')
        ->middleware('permission:booking-edit')
        ->name('update-bulk-attendance');
});
