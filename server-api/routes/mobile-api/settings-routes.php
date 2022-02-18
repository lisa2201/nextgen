<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/device-get-ccs-types', 'CenterSettingsController@deviceCcsTypes')
    ->name('device-get-ccs-types');

});
