<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
    Route::get('/get-selected-allergies', 'AllergiesController@get')
        ->middleware('permission:health-medical-access')
        ->name('get-child-allergies');

    Route::get('get-child-allergy-types','AllergiesController@getAllergyTypes')
        ->middleware('permission:health-medical-access')
        ->name('get-child-allergy-types');

    Route::get('/get-health-medical', 'HealthAndMedicalController@get')
        ->middleware('permission:health-medical-access')
        ->name('get-child-health-medical');

    /* post routes */
    Route::post('/child-allergy-store', 'AllergiesController@store')
        ->middleware('permission:health-medical-create')
        ->name('store-child-allergies');

    Route::post('/child-allergy-update', 'AllergiesController@update')
        ->middleware('permission:health-medical-edit')
        ->name('store-child-allergies');

    Route::delete('/delete-allergy', 'AllergiesController@delete')
        ->middleware('permission:health-medical-delete')
        ->name('delete-child-allergies');

        Route::post('/child-health-medical-update', 'HealthAndMedicalController@update')
        ->middleware('permission:health-medical-edit')
        ->name('store-health-medical');
});
// load allergy types in waitlist enrolment without user auth
Route::group(['prefix' => 'portal'], function () {
    /* get routes */

    Route::get('get-child-allergy-types','AllergiesController@getAllergyTypes')
        ->name('get-child-allergy-types');

    // Route::get('/get-branch-dynamic-fields', 'WaitListController@geDynamicFields')->name('get-Dynamic-Fields');

});