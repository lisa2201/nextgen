<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-role-list', 'RolesController@get')
        ->middleware('permission:role-access')
        ->name('get-roles');

    Route::get('/get-role-info', 'RolesController@edit')
        ->middleware('permission:role-access')
        ->name('get-role-details');

    Route::get('/role-data', 'RolesController@getDependency')
        ->middleware('permission:role-create')
        ->name('get-role-dependency');

    /* post routes */
    Route::post('/create-role', 'RolesController@create')
        ->middleware('permission:role-create')
        ->name('create-role');

    Route::post('/update-role', 'RolesController@update')
        ->middleware('permission:role-edit')
        ->name('update-role');

    Route::delete('/delete-role', 'RolesController@delete')
        ->middleware('permission:role-delete')
        ->name('delete-role');

});