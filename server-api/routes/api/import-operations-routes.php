<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/import-enrolment-data', 'CCSEnrolmentDataMigrationController@getDependency')
        ->middleware('permission:ccs-enrolment-access')
        ->name('get-css-enrolment-import-dependency');

    Route::get('/import-booking-data', 'BookingDataMigrationController@getDependency')
        ->middleware('permission:booking-access')
        ->name('get-booking-import-dependency');

    /* post routes */
    Route::post('/get-enrolment-list', 'CCSEnrolmentDataMigrationController@getEnrollments')
        ->middleware('permission:ccs-enrolment-access')
        ->name('get-import-enrolment-list');

    Route::post('/migrate-css-enrollments', 'CCSEnrolmentDataMigrationController@migrateEnrolments')
        ->middleware('permission:ccs-enrolment-create')
        ->name('migrate-ccs-enrollments');

    Route::post('/get-booking-list', 'BookingDataMigrationController@getBookings')
        ->middleware('permission:booking-access')
        ->name('get-import-booking-list');

    Route::post('/migrate-bookings', 'BookingDataMigrationController@migrateBookings')
        ->middleware('permission:booking-create')
        ->name('migrate-bookings');

    Route::post('/migrate-parent-csv-data', 'ParentDataMigrationController@migrateUser')
        ->middleware('permission:user-create')
        ->name('migrate-parent-csv-data');

    Route::get('/get-role-list-data-migration', 'StaffDataMigrationController@getRoles')
        ->middleware('permission:user-create')
        ->name('get-role-list-data-migration');

    Route::post('/migrate-staff-data', 'StaffDataMigrationController@migrateUser')
        ->middleware('permission:user-create')
        ->name('migrate-staff-data');

    Route::post('/migrate-parent-csv-data-sync-kinder-connect', 'UserDataSyncKinderConnectController@migrateUser')
        ->middleware('permission:user-create')
        ->name('migrate-parent-csv-data-sync-kinder-connect');




});
