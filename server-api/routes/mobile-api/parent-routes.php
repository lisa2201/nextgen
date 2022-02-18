<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{

    // Route::get('/device-get-booking-list', 'BookingController@deviceGetBookings')
    //     ->name('device-get-child-bookings');

    Route::post('/device-accept-cwa', 'ParentChildController@deviceAcceptCWA')
        ->name('device-accept-cwa');

    Route::get('/device-get-parent-emergency-contacts', 'EmergencyContactController@deviceGetParentEmergencyContacts');

    Route::post('/device-create-parent-emergency-contacts', 'EmergencyContactController@deviceAddEmergency');

    Route::post('/device-update-parent-emergency-contact', 'EmergencyContactController@deviceUpdateEmergency');

    Route::post('/device-delete-parent-emergency-contact', 'EmergencyContactController@deleteEmergency');

    Route::post('/device-update-profile', 'UserController@update')->name('device-update-profile');

    Route::post('/device-update-child-parent-login', 'ParentChildController@deviceUpdateChild')->name('device-update-child-parent-login');

    Route::post('/device-child-health-medical-update-parent-login', 'ParentChildController@deviceUpdateHealthMedical')
        ->name('device-child-health-medical-update-parent-login');

    Route::post('/device-child-allergy-store-parent', 'AllergiesController@deviceStoreParent')
        ->name('device-child-allergy-store-parent');

    Route::post('/device-child-allergy-update-parent', 'AllergiesController@deviceUpdateParent')
        ->name('device-child-allergy-update-parent');

    Route::delete('/device-delete-allergy-parent', 'AllergiesController@deviceDeleteParent')
        ->name('device-delete-allergy-parent');

    Route::get('device-get-child-allergy-types-parent','AllergiesController@deviceGetAllergyTypesParent')
        ->name('device-get-child-allergy-types-parent');

    Route::post('/device-update-child-documents-parent', 'ChildController@deviceUpdateDocumentsParent')
        ->name('update-child-documents-parent');

    Route::post('/device-get-child-documents-parent', 'ChildController@deviceGetDocuments')
        ->name('device-get-child-documents-parent');


});
