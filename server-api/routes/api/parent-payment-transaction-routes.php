<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/financial-account-transactions', 'ParentPayementTransactionsController@list')->name('list-financial-account-transactions');

});
