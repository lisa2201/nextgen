<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */


    /* post routes */
    Route::post('/upload-doc', 'UploadController@uploadDocs')
        ->middleware('permission:media-upload')
        ->name('create-role');

    /*Route::post('/update-role', 'RolesController@update')
        ->middleware('permission:role-edit')
        ->name('update-role');

    Route::delete('/delete-role', 'RolesController@delete')
        ->middleware('permission:role-delete')
        ->name('delete-role');*/

});