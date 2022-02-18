<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/device-booking-requests', 'BookingRequestController@deviceGetBookingRequests')
        ->name('device-get-booking-requests');

    Route::get('/device-booking-data', 'BookingRequestController@deviceGetBookingRequestDependency')
        ->name('device-get-booking-dependency');

    /* post routes */
    Route::post('/device-create-booking-request', 'BookingRequestController@deviceCreate')
        //->middleware('permission:booking-create')
        ->name('device-create-new-bookings');

    Route::post('/device-update-booking-request', 'BookingRequestController@deviceUpdate')
        ->name('device-update-bookings');

    Route::post('/device-delete-booking-request', 'BookingRequestController@deviceDelete')
        ->name('device-delete-booking-request');
});
