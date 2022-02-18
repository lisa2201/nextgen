<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('adjustment-item-list', 'AdjustmentItemController@list')
         ->middleware('permission:child-access')
        ->name('adjustment-item-list');

    Route::post('adjustment-item-create', 'AdjustmentItemController@create')
        ->name('adjustment-item-create');

    Route::post('adjustment-item-update', 'AdjustmentItemController@update')
        ->name('adjustment-item-update');

    Route::post('adjustment-item-delete', 'AdjustmentItemController@delete')
        ->name('adjustment-item-delete');

});
