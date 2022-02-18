<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-booking-requests', 'BookingRequestController@get')
        ->middleware('permission:booking-request-access')
        ->name('get-bookings-requests');

    Route::get('/verify-booking-request', 'BookingRequestController@verify')
        ->middleware('permission:booking-request-access')
        ->name('verify-booking-request');

    /* post routes */
    Route::post('/booking-request-action', 'BookingRequestController@action')
        ->middleware('permission:booking-request-create')
        ->name('booking-request-action');
});
