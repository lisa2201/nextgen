<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    // List invoice
    Route::get('/invoices', 'InvoiceController@listInvoice')->name('list-invoices');

    // Get invoice
    Route::get('/invoice', 'InvoiceController@getInvoice')->name('get-invoice');

});
