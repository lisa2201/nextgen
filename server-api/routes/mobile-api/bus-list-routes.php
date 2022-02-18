<?php

    Route::group(['prefix' => 'bus-list', 'middleware' => ['auth.user']], function () {

        Route::get('/device-get-bus-list', 'BusListController@deviceGetBusList');

        Route::get('/device-get-school-list', 'BusListController@getSchoolList');

        Route::get('/device-get-children-by-bus', 'BusListController@deviceGetSchoolChildrenByBus');

        Route::get('/device-get-bus-attendance', 'BusListController@deviceGetBusAttendance');

        Route::post('/device-bus-attendance-create', 'BusListController@deviceCreateBusAttendance');
    });


    