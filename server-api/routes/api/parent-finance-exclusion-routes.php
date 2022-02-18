<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/parent-finance-exclusion-list', 'ParentFinanceExclusionController@list')
        ->middleware('permission:parent-finance-exclusion-access')
        ->name('parent-finance-exclusion-list');

    Route::post('/parent-finance-exclusion-store', 'ParentFinanceExclusionController@create')
        ->middleware('permission:parent-finance-exclusion-create')
        ->name('parent-finance-exclusion-store');

    Route::post('/parent-finance-exclusion-delete', 'ParentFinanceExclusionController@delete')
        ->middleware('permission:parent-finance-exclusion-delete')
        ->name('parent-finance-exclusion-delete');

});
