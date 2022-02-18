<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    // Get Routes
    Route::get('finance-payment-plans', 'ParentPaymentScheduleController@list')
        ->middleware('permission:parent-payment-schedule-access')
        ->name('finance-payment-plan-list');
    
    // Post Routes
    Route::post('finance-payment-plan', 'ParentPaymentScheduleController@create')
        ->middleware('permission:parent-payment-schedule-create')
        ->name('finance-payment-plan-store');

    Route::post('finance-payment-plan-update', 'ParentPaymentScheduleController@update')
        ->middleware('permission:parent-payment-schedule-update')
        ->name('finance-payment-plan-update');

    Route::post('finance-payment-plan-delete', 'ParentPaymentScheduleController@delete')
        ->middleware('permission:parent-payment-schedule-delete')
        ->name('finance-payment-plan-delete');

});