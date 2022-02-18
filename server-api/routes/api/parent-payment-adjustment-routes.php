<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/financial-adjustments', 'ParentPaymentAdjustmentsController@list')->name('parent-payement-adjustment-list');
    Route::get('/financial-adjustments-room-list', 'ParentPaymentAdjustmentsController@getRoomList')->name('parent-payement-adjustment-room-list');
    Route::get('/financial-adjustments-child-list', 'ParentPaymentAdjustmentsController@getChildList')->name('parent-payement-adjustment-child-list');
    Route::get('/financial-adjustments-item-list', 'ParentPaymentAdjustmentsController@getAdjustmentItems')->name('parent-payement-adjustment-item-list');

    Route::post('/add-financial-adjustment', 'ParentPaymentAdjustmentsController@create')->name('parent-payement-add-financial-adjustment');
    Route::post('/delete-financial-adjustment', 'ParentPaymentAdjustmentsController@deleteAdjustment')->name('delete-financial-adjustment');
    Route::post('/reverse-financial-adjustment', 'ParentPaymentAdjustmentsController@reverseAdjustment')->name('reverse-financial-adjustment');




});
