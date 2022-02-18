<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('/financial-statements', 'ParentPaymentStatementController@list')->name('list-financial-statements');
    Route::get('/financial-statements-get-parents', 'ParentPaymentStatementController@getParentsList')->name('list-financial-statements-get-parents');
    Route::get('/financial-entitlement-statements-get-children', 'ParentPaymentStatementController@getChildrenList')->name('financial-entitlement-statements-get-children');

    Route::post('/financial-statements-preview-data', 'ParentPaymentStatementController@parentStatementPreviewData')->name('financial-statements-preview-data');
    Route::post('/financial-statements-pdf-preview', 'ParentPaymentStatementController@parentStatementPdfPreview')->name('financial-statements-pdf-preview');
    Route::post('/financial-statements-email', 'ParentPaymentStatementController@statementSend')->name('financial-statements-email');

    Route::post('/financial-entitlement-statements-pdf', 'ParentPaymentStatementController@entitlementStatementPdf')->name('financial-entitlement-statements-pdf');

});
