<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
    Route::get('/get-return-fee-data', 'ReturnFeeReductionController@get')
        ->middleware('permission:return-fee-reduction-access')
        ->name('get-return-fee-data');

    /* post routes */
    Route::post('/create-return-fee-reduction', 'ReturnFeeReductionController@create')
        ->middleware('permission:return-fee-reduction-create')
        ->name('return-fee-reduction-create');

    Route::post('/update-return-fee-reduction', 'ReturnFeeReductionController@update')
        ->middleware('permission:return-fee-reduction-edit')
        ->name('return-fee-reduction-edit');

    Route::post('/cancel-return-fee', 'ReturnFeeReductionController@delete')
        ->middleware('permission:return-fee-reduction-delete')
        ->name('return-fee-reduction-delete');
});
