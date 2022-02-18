<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{

    Route::get('/device-user-list', 'UserController@deviceGetStaff')
        ->middleware('permission:user-access')
        ->name('device-user-list');

    Route::post('/device-create-profile', 'UserController@create')
        ->middleware('permission:user-create')
        ->name('device-create-profile');

    Route::post('/device-update-user', 'UserController@update')
        ->middleware('permission:user-edit')
        ->name('device-update-user');
    
});
