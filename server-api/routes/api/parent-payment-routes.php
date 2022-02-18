<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    //------------------------------------------------------------------------------------//
    // Parent Payment Method Routes
    //------------------------------------------------------------------------------------//

    Route::get('/parent_payment_ezidebit_reference', 'ParentPaymentController@getEzidebitId')->name('parent-payment-ezidebit-reference');
    Route::post('/parent-payment-method-store', 'ParentPaymentController@storePaymentMethod')->name('parent-payment-method-store');
    Route::get('/parent-payment-methods-list', 'ParentPaymentController@listPaymentMethods')->name('parent-payment-methods-list');
    Route::post('/parent-payment-method-delete', 'ParentPaymentController@deletePaymentMethod')->name('parent-payment-method-delete');
    Route::post('/parent-default-payment-method', 'ParentPaymentController@setDefaultPaymentMethod')->name('parent-default-payment-method');
    Route::post('/parent-mail-ezidebit-link', 'ParentPaymentController@emailEzidebitLink')->name('parent-mail-ezidebit-link');
    Route::post('/parent-bulk-mail-ezidebit-link', 'ParentPaymentController@bulkMailEzidebitLink')->name('parent-bulk-mail-ezidebit-link');
    Route::post('/sync-parent-payment-method', 'ParentPaymentController@syncPaymentMethod')->name('sync-parent-payment-method');
    Route::get('/parent-payment-method-dependency', 'ParentPaymentController@parentPaymentMethodDependency')->name('parent-payment-method-dependency');
    Route::get('/parent-active-payment-method', 'ParentPaymentController@getActivePayment')->name('parent-active-payment-method');
    Route::post('/parent-deactivate-payment-method', 'ParentPaymentController@deactivatePaymentMethod')->name('parent-deactivate-payment-method');

    //------------------------------------------------------------------------------------//
    // Parent Payment Routes
    //------------------------------------------------------------------------------------//

    Route::post('/financial-add-manual-payment', 'ParentPaymentController@addManualPayment')->name('financial-add-manual-payment');
    Route::post('/financial-one-time-scheduled-payment', 'ParentPaymentController@addOneTimeScheduledPayment')->name('financial-one-time-scheduled-payment');
    Route::get('/financial-account-payments-list', 'ParentPaymentController@listPayments')->name('financial-account-payments-list');
    Route::get('/financial-account-payments-get', 'ParentPaymentController@getPayment')->name('financial-account-payments-get');
    Route::post('/financial-account-payments-update', 'ParentPaymentController@updatePayment')->name('financial-account-payments-update');
    Route::post('/financial-account-payments-refund', 'ParentPaymentController@refundPayment')->name('financial-account-payments-refund');
    Route::post('/financial-account-payments-retry', 'ParentPaymentController@retryParentPayment')->name('financial-account-payments-retry');
    Route::post('/financial-account-payments-sync-status', 'ParentPaymentController@syncPaymentStatus')->name('financial-account-payments-sync-status');



});
