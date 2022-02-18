<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('finance-payment-provider-branch-list', 'ParentPaymentProviderController@getBranchList')
        ->middleware('permission:parent-payment-providers-access')
        ->name('finance-payment-provider-branch-list');

    Route::get('/parent-payment-providers-list', 'ParentPaymentProviderController@list')
        ->middleware('permission:parent-payment-providers-access')
        ->name('parent-payment-providers-list');

    Route::post('/parent-payment-provider-key-validate', 'ParentPaymentProviderController@validateKeys')
        ->middleware('permission:parent-payment-providers-create')
        ->name('parent-payment-provider-key-validate');

    Route::post('/parent-payment-provider-store', 'ParentPaymentProviderController@store')
        ->middleware('permission:parent-payment-providers-create')
        ->name('parent-payment-provider-store');

    Route::post('/parent-payment-provider-update', 'ParentPaymentProviderController@update')
        ->middleware('permission:parent-payment-providers-update')
        ->name('parent-payment-provider-update');

    Route::post('/parent-payment-provider-delete', 'ParentPaymentProviderController@delete')
        ->middleware('permission:parent-payment-providers-delete')
        ->name('parent-payment-provider-delete');

});
