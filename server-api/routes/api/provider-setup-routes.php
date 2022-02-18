<?php



Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    Route::get('/get-list-providersetup', 'ProviderSetupcontroller@listProviders')
        ->name('list-providers');


    Route::get('/get-provider', 'ProviderSetupcontroller@getProvider');
    Route::get('/get-ccs-providers', 'ProviderSetupcontroller@getProviders');
    Route::post('/providers', 'ProviderSetupcontroller@create');
    Route::post('/edit-provider-address', 'ProviderSetupcontroller@editAddress');
    Route::post('/edit-provider-financial', 'ProviderSetupcontroller@editFinancial');
    Route::post('/edit-provider-contact', 'ProviderSetupcontroller@editContact');
    Route::post('/add-provider', 'ProviderSetupcontroller@addProvider');
    Route::post('/edit-provider-name', 'ProviderSetupcontroller@editBusinessName');


});









