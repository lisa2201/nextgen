<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-supplier-list', 'SupplierController@get')
        ->middleware('permission:supplier-access')
        ->name('get-supplier-list');

        Route::get('/get-suppliers', 'SupplierController@getAll')
        ->name('get-suppliers');

    Route::get('/get-category-list', 'CategoryController@get')
        ->middleware('permission:category-access')
        ->name('get-category-list');

    Route::get('/get-categories', 'CategoryController@getAll')
        ->name('get-categories');

    Route::get('/get-receipt-list', 'ReceiptController@get')
        ->name('get-receipt-list');

    Route::get('/get-reimbursement-list', 'ReimbursementsController@get')
        ->name('get-reimbursement-list');

    Route::get('/petty-cash-report-data', 'SupplierController@getReportData')
        ->name('petty-cash-report-data');



    /* post routes */
    //supplier
    Route::post('/create-supplier', 'SupplierController@create')
        ->middleware('permission:supplier-create')
        ->name('create-supplier');

    Route::post('/update-supplier', 'SupplierController@update')
        ->middleware('permission:supplier-edit')
        ->name('update-supplier');

    Route::delete('/delete-supplier', 'SupplierController@delete')
        ->middleware('permission:supplier-delete')
        ->name('delete-supplier');

        //category
    Route::post('/create-category', 'CategoryController@create')
        ->middleware('permission:category-create')
        ->name('create-category');

    Route::post('/update-category', 'CategoryController@update')
        ->middleware('permission:category-edit')
        ->name('update-category');

    Route::delete('/delete-category', 'CategoryController@delete')
        ->middleware('permission:category-delete')
        ->name('delete-category');

        //receipt
    Route::post('/create-receipt', 'ReceiptController@create')
        ->middleware('permission:receipt-create')
        ->name('create-receipt');

    Route::post('/update-receipt', 'ReceiptController@update')
        ->middleware('permission:receipt-edit')
        ->name('update-receipt');

    Route::delete('/delete-receipt', 'ReceiptController@delete')
        ->middleware('permission:receipt-delete')
        ->name('delete-receipt');

    Route::post('/run-petty-cash-script', 'ReceiptController@script')
        ->name('run-petty-cash-script');

        //reimbursement
    Route::post('/create-reimbursement', 'ReimbursementsController@create')
        ->middleware('permission:reimbursements-create')
        ->name('create-reimbursement');

    Route::post('/update-reimbursement', 'ReimbursementsController@update')
        ->middleware('permission:reimbursements-edit')
        ->name('update-reimbursement');

    Route::delete('/delete-reimbursement', 'ReimbursementsController@delete')
        ->middleware('permission:reimbursements-delete')
        ->name('delete-reimbursement');

});
