<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/payment-histories', 'PaymentHistoryController@list')->name('list-payment-histories');

    // get ezidebit id
    Route::get('/payment_ezidebit_reference', 'PaymentController@getEzidebitId')->name('payment-ezidebit-reference');

    // payment complete
    Route::post('/subscribe_payment_info', 'PaymentController@completePayment')->name('subscribe-payment-info');

    // List payment methods
    Route::get('/payment_informations', 'PaymentController@listPaymentMethods')->name('list-payment-informations');

    // Delete payment method
    Route::delete('/payment-method', 'PaymentController@deletePaymentMethod')->name('delete-payment-information');

    // Set default payment method
    Route::post('/default-payment-method', 'PaymentController@setDefaultPaymentMethod')->name('default-payment-information');

    // Manual Payment
    Route::post('/manual-payment', 'PaymentController@manualPayment')->name('manual-payment');

});
