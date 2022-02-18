<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::post('/store-room', 'RoomController@store')
        ->middleware('permission:room-create')
        ->name('store-room');

    Route::get('/get-list-room', 'RoomController@get')
        ->middleware('permission:room-access')
        ->name('get-room');

    Route::get('/get-rooms', 'RoomController@getAll')
        ->name('get-all-rooms');

    Route::get('/get-room-info', 'RoomController@edit')
        ->middleware('permission:room-access')
        ->name('get-room-details');

    Route::get('/staff-list', 'RoomController@getStaffList')
        ->middleware('permission:room-create')
        ->name('store-room');

    /* post routes */
    Route::post('/update-room-status', 'RoomController@updateStatus')
        ->middleware('permission:room-edit')
        ->name('update-room-status');

    Route::post('/update-room', 'RoomController@update')
        ->middleware('permission:room-edit')
        ->name('update-room');

    Route::post('/add-capacity', 'RoomController@addCapacity')
        ->middleware('permission:room-edit')
        ->name('store-room');
    Route::delete('/delete-room', 'RoomController@delete')
        ->middleware('permission:room-delete')
        ->name('delete-room');

});
