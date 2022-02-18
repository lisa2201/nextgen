<?php

    Route::group(['prefix' => 'kiosk-api', 'middleware' => ['auth.user']], function () {

        Route::post('/device-reset-parent-pincode', 'KioskController@deviceResetParentPincode');

        Route::get('/device-get-child-attendance', 'KioskController@deviceGetChildAttendance');

        Route::get('/device-get-attendance-by-day', 'KioskController@deviceGetAttendanceByDay');

        Route::post('/device-attendance-create', 'KioskController@deviceCreateAttendance');

        Route::get('/device-get-child-data', 'KioskController@deviceGetChildren');

        Route::get('/device-get-child-data-by-room', 'KioskController@deviceGetChildrenByRoom');

        Route::get('/device-get-staff-rooms', 'KioskController@deviceGetStaffRooms');

        Route::get('/device-get-room/{id}', 'KioskController@deviceGetRoom');

        Route::get('/device-get-missed-attendance', 'KioskController@deviceGetMissedAttendance');

        Route::post('/device-complete-missed-attendance', 'KioskController@deviceCompleteMissedAttendance');

        Route::get('/device-get-booking-list', 'KioskController@deviceGetChildBookings');

        Route::get('/device-get-casual-fees', 'KioskController@deviceGetCasualFees');

        Route::post('/device-create-casual-attendance', 'BookingController@createSingle');
     
    });


    