<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-session-submissions-list', 'ManageSessionSubmissionsController@get')
        ->middleware('permission:session-submission-access')
        ->name('get-session-submissions-list');

    Route::get('/session-submissions-data', 'ManageSessionSubmissionsController@getDependency')
        ->middleware('permission:session-submission-create')
        ->name('get-session-submissions-dependency');

    Route::get('/widget-get-session-submission-summary', 'ManageSessionSubmissionsController@widgetSessionSubmissionSummary')
        ->middleware('permission:session-submission-access')
        ->name('widget-get-session-submission-summary');

    /* post routes */
    Route::post('/bulk-session-submission', 'ManageSessionSubmissionsController@create')
        ->middleware('permission:session-submission-create')
        ->name('bulk-session-submission');

    Route::post('/get-session-summary-report', 'ManageSessionSubmissionsController@getSessionReports')
        ->middleware('permission:session-submission-access')
        ->name('get-session-summary-report');
});
