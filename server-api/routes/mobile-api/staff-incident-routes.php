<?php

Route::group(['prefix' => 'portal'], function ()
{
    /* get routes */
    Route::get('/device-incident-list', 'StaffIncidentController@deviceGetIncidentList')
        ->middleware('permission:staff-incident-access')
        ->name('device-incident-list');
    
});