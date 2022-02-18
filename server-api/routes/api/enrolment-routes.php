<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-enrolment-history', 'CCSEnrolmentController@getEnrolmentHistory')
        ->middleware('permission:ccs-enrolment-access')
        ->name('get-enrolment-history');

    Route::get('/get-enrolment-entitlement', 'CCSEnrolmentController@getEntitlement')
        ->middleware('permission:ccs-enrolment-access')
        ->name('get-enrolment-entitlement');

    Route::get('/enrolment-data', 'CCSEnrolmentController@getDependency')
        ->middleware('permission:ccs-enrolment-create')
        ->name('get-enrolment-dependency');

    Route::get('/get-enrolment-bookings', 'CCSEnrolmentController@getEnrolmentBookings')
        ->middleware('permission:ccs-enrolment-create')
        ->name('get-enrolment-bookings');

    Route::get('/check-enrolment-status', 'CCSEnrolmentController@getEnrolmentStatus')
        ->middleware('permission:ccs-enrolment-create')
        ->name('check-enrolment-status');

    Route::get('/get-enrolment-info', 'CCSEnrolmentController@edit')
        ->middleware('permission:ccs-enrolment-edit')
        ->name('get-enrolment-details');

    Route::get('/get-enrolment', 'CCSEnrolmentController@getEnrolmentFromApi')
        ->middleware('permission:ccs-enrolment-access')
        ->name('get-enrolment');

    /* post routes */
    Route::post('/set-crn', 'CCSEnrolmentController@setCRN')
        ->middleware('permission:ccs-enrolment-create|ccs-enrolment-edit')
        ->name('set-crm');

    Route::post('/save-enrolment', 'CCSEnrolmentController@create')
        ->middleware('permission:ccs-enrolment-create')
        ->name('save-child-enrolment');

    Route::post('/update-enrolment', 'CCSEnrolmentController@update')
        ->middleware('permission:ccs-enrolment-edit')
        ->name('update-child-enrolment');

    Route::post('/update-enrolment-parent-status', 'CCSEnrolmentController@updateParentStatus')
        ->middleware('permission:ccs-enrolment-edit')
        ->name('update-enrolment-parent-status');

    Route::post('/send-cwa-email-to-parent', 'CCSEnrolmentController@sendEmail')
        ->middleware('permission:ccs-enrolment-edit')
        ->name('send-cwa-email-to-parent');

    Route::post('/submit-enrolment', 'CCSEnrolmentController@submit')
        ->middleware('permission:ccs-enrolment-submit')
        ->name('submit-child-enrolment');

    Route::post('/verify-enrolment', 'CCSEnrolmentController@verifyEnrolment')
        ->middleware('permission:ccs-enrolment-create')
        ->name('verify-ccs-enrolment');

    Route::post('/close-enrolment', 'CCSEnrolmentController@closeEnrolment')
        ->middleware('permission:ccs-enrolment-edit')
        ->name('close-ccs-enrolment');

    Route::delete('/delete-enrolment', 'CCSEnrolmentController@delete')
        ->middleware('permission:ccs-enrolment-delete')
        ->name('delete-enrolment');
});
