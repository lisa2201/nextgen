<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
    Route::post('/query-remittance', 'CCMSOperationsController@queryRemittance')
        ->name('query-remittance');
    Route::post('/query-payments','CCMSOperationsController@queryPayments')
        ->name('query-payments');
});