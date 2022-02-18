<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::post('/personal-service-data-submit', 'PersonnelServiceController@getFile');
    Route::post('/create-personnel-service', 'PersonnelServiceController@create');

    Route::get('/get-personnel-list', 'PersonnelServiceController@getPersonnelList');
    Route::get('/get-service-personnel-info', 'PersonnelServiceController@getPersonnelInfo');

    Route::post('/update-service-personnel-declaration', 'PersonnelServiceController@updateDeclaration');
    Route::post('/add-service-personnel-new-data', 'PersonnelServiceController@addNewData');
    Route::post('/update-personnel-service', 'PersonnelServiceController@update');
    Route::get('/get-user-list-personnel', 'PersonnelServiceController@getUser');
    Route::post('/add-service-personnel-contact', 'PersonnelServiceController@editContact');

});
