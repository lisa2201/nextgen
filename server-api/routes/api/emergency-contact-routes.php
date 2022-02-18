<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
        Route::post('/add-emergency-contact','EmergencyContactController@addEmergency')
            ->middleware('permission:child-emergency-create')
            ->name('add-emergency');
        Route::post('/update-emergency-contact','EmergencyContactController@updateEmergency')
            ->middleware('permission:child-emergency-edit')
            ->name('update-emergency');
        Route::get('/get-emergency','EmergencyContactController@getEmergencyContacts')
            ->middleware('permission:child-emergency-access')
            ->name('get-emergency');
        Route::delete('/delete-emergency-contact','EmergencyContactController@deleteEmergency')
            ->middleware('permission:child-emergency-delete')
            ->name('delete-emeregency');

        Route::get('/get-emergency-for-parent ','EmergencyContactController@getParentEmergencyContacts')
            ->middleware('permission:child-emergency-access')
            ->name('get-parent-emergency');
});
