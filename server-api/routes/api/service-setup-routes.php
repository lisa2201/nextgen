<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::get('/get-list-service-setup', 'ServiceSetupcontroller@listServices')->name('list-services');
    Route::get('/get-service', 'ServiceSetupcontroller@getService');
    Route::get('/services','ServiceSetupController@create');
    Route::get('/get-accs-percentage', 'ServiceSetupcontroller@getAccsPercentage');
    Route::get('/ping-ccms','ServiceSetupController@pingCCMS');
    Route::get('/get-educator-ratio','ServiceSetupController@getEducatorRatio');

    Route::get('/get-bus-list', 'BusListController@getBusList');

    Route::get('/get-school-list', 'BusListController@getSchoolList');

    Route::get('/get-school-busses', 'BusListController@getSchoolBusses');

    Route::get('/get-children-by-school', 'BusListController@getChildrenBySchool')
        ->middleware('permission:buslist-access');

    Route::get('/get-children-by-bus', 'BusListController@getChildrenAndSchoolsByBus')
        ->middleware('permission:buslist-access');



    Route::post('/create-bus', 'BusListController@createBus')
        ->middleware('permission:buslist-create');

    Route::post('/update-bus', 'BusListController@updateBus')
        ->middleware('permission:buslist-edit');

    Route::post('/delete-bus', 'BusListController@deleteBus')
        ->middleware('permission:buslist-delete');

    Route::post('/create-school', 'BusListController@createSchool')
        ->middleware('permission:buslist-create');

    Route::post('/update-school', 'BusListController@updateSchool')
        ->middleware('permission:buslist-edit');

    Route::post('/delete-school', 'BusListController@deleteSchool')
    ->middleware('permission:buslist-delete');

    /* removed after room id was also applied to buslist */
    /*Route::post('/add-children-to-bus', 'BusListController@addChildrenToBus')
        ->middleware('permission:buslist-edit');*/

    Route::post('/set-state','ServiceSetupController@setState');

    Route::post('/service-credentials','ServiceSetupController@updateCredentials');
    Route::post('/service-setup-edit-address', 'ServiceSetupcontroller@editAddress');
    Route::post('/service-setup-edit-financial', 'ServiceSetupcontroller@editFinancial');
    Route::post('/service-setup-edit-contact', 'ServiceSetupcontroller@editContact');
    Route::post('/service-setup-edit-name', 'ServiceSetupcontroller@editName');

    Route::post('/add-service', 'ServiceSetupcontroller@addService');
});
