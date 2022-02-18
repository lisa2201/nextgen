<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-attendance-list', 'AttendanceController@get')
        ->middleware('permission:attendance-access')
        ->name('get-attendances');

    /* get dashboard live ratio */
    Route::get('/get-dashboard-live-ratio', 'AttendanceController@getDashboardLiveRatio')
        ->middleware('permission:attendance-access')
        ->name('get-dashboard-attendances');

    /* get dashboard attendance summary */
    Route::get('/get-dashboard-attendance-summary', 'AttendanceController@getDashboardAttendanceSummary')
        ->middleware('permission:attendance-access')
        ->name('get-dashboard-attendances');

    /* post routes */
    Route::post('/attendance-by-children', 'AttendanceController@getAttendanceByChildren')
        ->middleware('permission:attendance-access|booking-access')
        ->name('get-attendances-by-children');

    Route::get('get-center-wise-ratio-dashboard','AttendanceController@getCenterWiseRatioData')
        ->middleware('permission:attendance-access')
        ->name('get-center-wise-ratio-dashboard');
    /*Route::post('/create-child', 'AttendanceController@create')
        ->middleware('permission:attendance-create')
        ->name('create-child');

    Route::post('/update-child', 'AttendanceController@update')
        ->middleware('permission:attendance-edit')
        ->name('update-child');

    Route::post('/update-attendance-room', 'AttendanceController@updateRoom')
        ->middleware('permission:attendance-edit')
        ->name('attach-room-to-child');

    Route::post('/update-attendance-user', 'AttendanceController@updateUser')
        ->middleware('permission:attendance-edit')
        ->name('attach-user-to-child');

    Route::delete('/delete-child', 'AttendanceController@delete')
        ->middleware('permission:attendance-delete')
        ->name('delete-child');*/
});
