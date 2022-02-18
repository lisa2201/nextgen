<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-user-list', 'UserController@get')
        ->middleware('permission:user-access')
        ->name('get-users');

    Route::get('/get-user-info', 'UserController@edit')
        ->middleware('permission:user-access')
        ->name('get-user-details');

    Route::get('/user-data', 'UserController@getDependency')
        ->middleware('permission:user-create|invitation-create')
        ->name('get-user-dependency');

    Route::get('/user-email-check', 'UserController@checkEmail')
        ->middleware('permission:user-create')
        ->name('check-user-email');

    Route::get('/get-all-active-parents', 'UserController@getAllActiveParents')
        ->middleware('permission:user-access')
        ->name('get-all-active-parents');

    Route::get('/get-user-by-branch', 'UserController@findByBranch')
        ->middleware('permission:user-access')
        ->name('get-user-by-branch');

    Route::get('/send-bulk-sns-user', 'UserController@sendBulkSNS')
        ->middleware('permission:child-access')
        ->name('send-bulk-sns-user');



    /* post routes */
    Route::post('/create-user', 'UserController@create')
        ->middleware('permission:user-create')
        ->name('create-user');

    Route::post('/update-user-status', 'UserController@updateStatus')
        ->middleware('permission:user-edit')
        ->name('update-user-status');

    Route::post('/update-user', 'UserController@update')
        ->middleware('permission:user-edit')
        ->name('update-user');

    Route::delete('/delete-user', 'UserController@delete')
        ->middleware('permission:user-delete')
        ->name('delete-user');


    Route::get('/get-all-user-parents', 'UserController@getAllParents')
        ->middleware('permission:user-access')
        ->name('get-all-user-parents');

    Route::post('/update-user-room', 'UserController@updateRoom')
        ->middleware('permission:user-edit')
        ->name('attach-room-to-user');


    Route::post('/generate-pi-user', 'UserController@generatePin')
        ->middleware('permission:user-edit')
        ->name('generate-pi-user');

});
