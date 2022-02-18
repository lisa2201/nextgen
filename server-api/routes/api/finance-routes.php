<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    Route::get('finance-accounts-list', 'FinanceController@listAccounts')
         ->middleware('permission:child-access')
        ->name('finance-accounts-list');

    // Get parent list for select menus
    Route::get('finance-branch-list', 'FinanceController@getBranchList')
        ->name('finance-branch-list');

    Route::get('finance-org', 'FinanceController@getOrgInfo')
        ->name('finance-org');

    // Get branch list for select menus
    Route::get('finance-parent-list', 'FinanceController@getParentList')
        ->name('finance-parent-list');

    // Get account balance
    Route::get('/financial-account-balance', 'FinanceController@getAccountBalance')->name('financial-account-balance');

    Route::get('/finance-children-without-payer', 'FinanceController@getChildrenWithoutPayer')->name('finance-children-without-payer');

    //------------------------------------------------------------------------------------//
    // Dashboard summary Routes
    //------------------------------------------------------------------------------------//
    Route::get('/get-parent-payment-dashboard-summary', 'FinanceController@getPaymentDashboardSummary')->name('get-parent-payment-dashboard-summary');
    Route::get('/get-parent-payment-overdue-dashboard-summary', 'FinanceController@getOverdueDashboardSummary')->name('get-parent-payment-overdue-dashboard-summary');

    //------------------------------------------------------------------------------------//
    // Bulk Operation Routes
    //------------------------------------------------------------------------------------//
    Route::get('finance-ccs-payments-list', 'FinanceController@listCCSPayments')->name('finance-ccs-payments-list');
    Route::get('session-subsidy-list', 'FinanceController@listSessionSubsidies')->name('session-subsidy-list');
    Route::get('session-subsidy-dependancy', 'FinanceController@getSessionSubsidyDependency')->name('session-subsidy-dependancy');
    Route::get('view-entitlement-dependancy', 'FinanceController@getViewEntitlementDependency')->name('view-entitlement-dependancy');
    Route::get('session-subsidy-csv', 'FinanceController@sessionSubsidyCsv')->name('session-subsidy-csv');
    Route::get('ccs-payments-csv', 'FinanceController@ccsPaymentsCsv')->name('ccs-payments-csv');
    Route::post('view-session-reports', 'FinanceController@viewSessionReports')->name('view-session-reports');
    Route::post('view-entitlement', 'FinanceController@viewEntitlement')->name('view-session-reports');

    Route::get('/get-select-list-parents', 'FinanceController@getSelectparentList')->name('get-select-list-parents');
    Route::post('/recalculate-booking-transactions', 'FinanceController@invokeBookingTransactions')->name('recalculate-booking-transactions');

    //------------------------------------------------------------------------------------//
    // Waive Fee Routes
    //------------------------------------------------------------------------------------//

    Route::get('finance-parent-waive-fee-users', 'FinanceController@waiveFeeUsers')
        ->name('finance-parent-waive-fee-users');

    Route::post('finance-parent-waive-fee-preview-data', 'FinanceController@waiveFeePreviewData')->name('finance-parent-waive-fee-preview-data');
    Route::post('finance-parent-waive-fee', 'FinanceController@waiveFeeAdjust')->name('finance-parent-waive-fee');

    Route::post('finance-parent-bulk-auto-charge-update', 'FinanceController@bulkAutoChargeUpdate')->name('finance-parent-bulk-auto-charge-update');


});
