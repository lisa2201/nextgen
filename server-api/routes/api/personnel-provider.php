<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::get('/get-provider-personnel-list', 'PersonnelProviderController@getPersonnelList');
    Route::post('/create-personnel-provider', 'PersonnelProviderController@create');
    Route::get('/get-provider-personnel-info', 'PersonnelProviderController@getPersonnelInfo');

    Route::post('/add-provider-personnel-contact', 'PersonnelProviderController@editContact');
    Route::post('/update-personnel-provider', 'PersonnelProviderController@update');

    Route::post('/add-provider-personnel-new-data', 'PersonnelProviderController@addNewData');

});
