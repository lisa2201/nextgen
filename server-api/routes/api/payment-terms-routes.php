<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/payment-terms-list', 'PaymentTermsController@list')->name('payment-terms-list');

    Route::post('/payment-terms-store', 'PaymentTermsController@create')->name('payment-terms-store');

    Route::post('/payment-terms-update', 'PaymentTermsController@update')->name('payment-terms-update');

    Route::post('/payment-terms-update-status', 'PaymentTermsController@updateStatus')->name('payment-terms-update-status');

    Route::post('/payment-terms-delete', 'PaymentTermsController@delete')->name('payment-terms-delete');

});
