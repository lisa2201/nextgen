<?php

Route::group(['prefix' => 'portal'], function ()
{
    /* get routes */
    Route::get('/device-staff-list', 'VisitorDetailsController@deviceGetStaffList')
        ->name('device-staff-list');

    Route::get('/device-today-signedIn-visitor-by-mobile', 'VisitorDetailsController@todaySignedInVisitorByMobile')
        ->name('device-today-visitor-by-mobile');
        
    Route::get('/device-visitor-list', 'VisitorDetailsController@deviceGetVisitorList')
        ->name('device-visitor-list');

    Route::get('/device-get-visitor', 'VisitorDetailsController@deviceGetVisitor')
        ->name('device-get-visitor');
        
    /* post routes */
    Route::post('/device-visitor-sign-in', 'VisitorDetailsController@deviceVisitorsignIn')
        ->name('device-visitor-sign-in');

    Route::post('/device-visitor-sign-out', 'VisitorDetailsController@deviceVisitorsignOut')
        ->name('device-visitor-sign-out');

    Route::post('/device-update-visitor-record', 'VisitorDetailsController@deviceUpdate')
        ->name('device-update-visitor-record');

    Route::post('/device-delete-visitor-record', 'VisitorDetailsController@deviceDelete')
        ->name('device-delete-visitor-record');
    
});
