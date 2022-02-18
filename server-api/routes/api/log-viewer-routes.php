<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user', 'role:portal-admin']], function ()
{
    Route::get('/get-logs', 'LogViewerController@getLogs')->name('get-laravel-logs');
});
