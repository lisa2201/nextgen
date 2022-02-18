<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{

    Route::post('/view-contact-report', 'ContactReportController@view')
        ->middleware('permission:contact reports')
        ->name('view-contact-report');

    Route::post('/aged-debtors-finance-report', 'FinanceReportController@agedDebtorsData')
        ->middleware('permission:contact reports')
        ->name('aged-debtors-finance-report');

    Route::post('/income-summary-finance-report', 'FinanceReportController@incomeSummaryReportData')
        ->middleware('permission:contact reports')
        ->name('income-summary-finance-report');

    Route::post('/account-balance-finance-report', 'FinanceReportController@accountBalanceReportData')
        ->middleware('permission:contact reports')
        ->name('account-balance-finance-report');

    Route::post('/finance-bond-report', 'FinanceReportController@bondReportData')
        ->middleware('permission:contact reports')
        ->name('finance-bond-report');

    Route::post('/financial-adjustment-report', 'FinanceReportController@financialAdjustmentsData')
        ->middleware('permission:contact reports')
        ->name('finance-bond-report');

    Route::post('opening-balance-report', 'FinanceReportController@openingBalanceReport')
        ->middleware('permission:contact reports')
        ->name('finance-bond-report');

    Route::post('/weekly-revenue-summary-report', 'FinanceReportController@weeklyRevenueSummaryReportData')
        ->middleware('permission:contact reports')
        ->name('weekly-revenue-summary-report');

    Route::post('/projected-weekly-revenue-summary-report', 'FinanceReportController@projectedWeeklyRevenueSummaryReportData')
        ->middleware('permission:contact reports')
        ->name('projected-weekly-revenue-summary-report');

    Route::post('/transaction-summary-finance-report', 'FinanceReportController@transactionSummaryReportData')
        ->middleware('permission:contact reports')
        ->name('transaction-summary-finance-report');

    Route::post('/gap-fee-report', 'FinanceReportController@gapFeeReportData')
        ->middleware('permission:contact reports')
        ->name('gap-fee-report');

    Route::post('/banking-summary-report', 'FinanceReportController@bankingSummaryReportData')
        ->middleware('permission:contact reports')
        ->name('banking-summary-report');

    Route::get('/view-finance-report', 'FinanceReportController@view')
        ->middleware('permission:contact reports')
        ->name('view-finance-report');

    Route::get('/get-finance-report-users', 'FinanceReportController@getUsers')
        ->middleware('permission:contact reports')
        ->name('get-finance-report-users');

    Route::post('/view-attendance-report', 'AttendanceReportController@view')
        ->middleware('permission:contact reports')
        ->name('view-attendance-report');

    Route::post('view-bus-attendance-report', 'BusListController@viewBusAttendanceReport')
        ->middleware('permission:buslist-access');

    Route::post('view-buslist-report', 'BusListController@viewBusListReport')
        ->middleware('permission:buslist-access');

    Route::post('/save-selected-field', 'ContactReportController@saveField')
        ->middleware('permission:contact reports')
        ->name('save-selected-field');

    Route::post('/get-repots-data', 'ContactReportController@getReportData')
        ->middleware('permission:contact reports')
        ->name('get-selected-field');

    Route::get('/add-fav-report', 'ContactReportController@addFavorite')
        ->middleware('permission:contact reports')
        ->name('add-fav-report');

    Route::get('/get-children-report', 'ContactReportController@getAllChildren')
        ->middleware('permission:contact reports')
        ->name('get-children-report');

    Route::get('/get-rooms-report', 'ContactReportController@getAllRooms')
        ->middleware('permission:contact reports')
        ->name('get-rooms-report');

    Route::get('/get-user-report', 'ContactReportController@listAccounts')
        ->middleware('permission:contact reports')
        ->name('get-user-report');

    Route::post('/ccs-enrolment-report', 'CCMSReportController@CCSEnrolmentReport')
        ->middleware('permission:contact reports')
        ->name('ccs-enrolment-report');


    Route::delete('/delete-report', 'ContactReportController@delete')
        ->middleware('permission:contact reports')
        ->name('delete-report');


    Route::post('/update-report-name', 'ContactReportController@updateReportName')
        ->middleware('permission:contact reports')
        ->name('update-report-name');


    Route::post('/view-contact-primary-payer-report', 'ContactReportController@viewPrimaryPayerReport')
        ->middleware('permission:contact reports')
        ->name('view-contact-primary-payer-report');

});
