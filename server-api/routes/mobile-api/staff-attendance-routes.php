<?php

    Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

        Route::get('/device-get-staff-attendance', 'KioskController@deviceGetStaffAttendance');

        Route::post('/device-create-staff-attendance', 'KioskController@deviceCreateStaffAttendance');

        Route::post('/device-delete-staff-attendance', 'KioskController@deviceDeleteStaffAttendance');
    });


