<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/device-get-booking-list', 'BookingController@deviceGetBookings')
        ->name('device-get-child-bookings');

    /* get ytd data */
    Route::get('/device-get-parent-ytd', 'AttendanceController@deviceGetParentYtd')
        ->name('device-get-parent-ytd');

    /* dashboard widget- attendance */
    Route::get('/device-dashboard-attendance', 'AttendanceController@getDashboardAttendanceSummary')
        ->name('device-dashboard-attendance');

    /* dashboard widget- room attendance */
    Route::get('/device-room-attendance-summary', 'AttendanceController@deviceRoomAttendanceSummary')
        ->name('device-dashboard-room-attendance-summary');

    /* kc rosters - room bookings */
    Route::get('/device-weekly-room-booking-summary', 'AttendanceController@deviceWeeklyRoomBookingSummary')
        ->name('device-weekly-room-booking-summary');

    /* dashboard widget- live ratio */
    Route::get('/device-dashboard-live-ratio', 'AttendanceController@getDashboardLiveRatio')
        ->name('device-dashboard-live-ratio');

    /* dashboard widget- center wise ratio */
    Route::get('/device-dashboard-center-wise-ratio', 'AttendanceController@getCenterWiseRatioData')
        ->name('device-dashboard-center-wise-ratio');

    /* get absent child list */
    Route::get('/device-absent-children', 'AttendanceController@deviceGetAbsentChildren')
        ->name('device-absent-children');

    /* post routes */
//    Route::post('/get-booking-preview', 'BookingController@previewSlots')
//        ->middleware('permission:booking-create')
//        ->name('get-preview-booking-slots');
//
//    Route::post('/create-booking', 'BookingController@create')
//        ->middleware('permission:booking-create')
//        ->name('create-child-booking');
//
//    Route::post('/create-single-booking', 'BookingController@createSingle')
//        ->middleware('permission:booking-create')
//        ->name('create-single-child-booking');
//
//    Route::post('/update-single-booking', 'BookingController@updateSingle')
//        ->middleware('permission:booking-edit')
//        ->name('update-single-booking');
//
//    Route::delete('/delete-booking', 'BookingController@delete')
//        ->middleware('permission:booking-delete')
//        ->name('delete-role');
//
//    Route::post('/update-booking-type', 'BookingController@updateBookingType')
//        ->middleware('permission:booking-edit')
//        ->name('update-single-booking-type');
//
//    Route::post('/manage-bookings-preview', 'BookingController@manageBookingsPreviewSlots')
//        ->middleware('permission:booking-edit|booking-delete')
//        ->name('manage-bookings-preview-slots');
//
//    Route::post('/manage-bookings', 'BookingController@update')
//        ->middleware('permission:booking-edit')
//        ->name('update-bookings');
//
//    Route::post('/get-bookings-bulk-attendance', 'BookingController@bulkBookingAttendancePreview')
//        ->middleware('permission:booking-edit')
//        ->name('get-booking-preview-bulk-attendance-update');
//
//    Route::post('/update-bulk-attendance', 'BookingController@updateBulkAttendance')
//        ->middleware('permission:booking-edit')
//        ->name('update-bulk-attendance');
});
