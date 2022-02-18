<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::get('/get-staff-incidents', 'StaffIncidentController@get')
        ->middleware('permission:staff-incident-access')
        ->name('get-staff-incidents');

    Route::get('/get-incident', 'StaffIncidentController@getIncident')
        ->middleware('permission:staff-incident-access')
        ->name('get-incident');

    Route::post('/store-staff-incident', 'StaffIncidentController@create')
        ->middleware('permission:staff-incident-create')
        ->name('store-staff-incident');

    Route::post('/update-staff-incident', 'StaffIncidentController@update')
        ->middleware('permission:staff-incident-edit')
        ->name('update-staff-incident');

    Route::delete('/delete-incident', 'StaffIncidentController@delete')
       ->middleware('permission:staff-incident-delete')
        ->name('delete-incident');

});
