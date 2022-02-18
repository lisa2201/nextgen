<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
        Route::get('/get-profile-info', 'ProfileController@get')
        ->name('get-profile-info');

        Route::post('/update-user-data', 'ProfileController@update')
        ->name('update-user-profile-data');

        Route::post('/update-staff-image', 'ProfileController@updateImage')
        ->name('update-user-profile-data');

        Route::post('/delete-staff-image', 'ProfileController@deleteImage')
        ->name('update-user-profile-data');

        Route::post('/user-email-notification', 'ProfileController@emailNotifications')
        ->name('user-email-notification');
});
