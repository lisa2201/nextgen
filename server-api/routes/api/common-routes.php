<?php

//get subscription plans
Route::get('/get_subscription_plans', 'CommonController@getSubscriptionPlans')->name('get-subscription-plans');

//verify organization branch
Route::get('/verify-org', 'CommonController@verifyOrganization')->name('verify-organization-branch');

//Get States
Route::get('/country-states', 'CommonController@countryStates')->name('get-country-states');

// Get presigned s3 url (included for public)
Route::get('/s3-signed-url', 'CommonController@getPreSignedUrl')->name('s3-signed-url');

//Authenticated routes
Route::group(['middleware' => ['auth.user']], function ()
{
    //Get client payment information
    Route::get('/get-client-payment-info', 'CommonController@getPaymentInfo')->name('get-payment-info');

    //Check if value exists
    Route::get('/value-exists', 'CommonController@checkValueExists')->name('check-value-exists');
});

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::get('/get-child-parent-type-list', 'CommonController@getParentTypeUsersForChild')->name('get-parent-type-users-for-child');

    Route::get('/get-users-for-emergency-contacts', 'CommonController@getUsersForEmergencyContacts')->name('get-users-for-emergency-contacts');

    Route::get('/get-child-room-list', 'CommonController@getRoomsForChild')->name('get-rooms-for-child');

    Route::get('/get-user-room-list', 'CommonController@getRoomsForUser')->name('get-rooms-for-user');

    Route::get('/get-branch-room-list', 'CommonController@getRoomsForBranch')->name('get-rooms-for-branch');

});


