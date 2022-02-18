<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-session-submission-list', 'SessionSubmissionController@get')
        ->middleware('permission:session-submission-access')
        ->name('get-session-submissions');

    Route::get('/session-submission-data', 'SessionSubmissionController@getDependency')
        ->middleware('permission:session-submission-create')
        ->name('get-session-submission-dependency');

    Route::get('/get-withdrawal-data', 'SessionSubmissionController@getWithdrawalDependency')
        ->middleware('permission:session-submission-withdraw')
        ->name('get-session-submission-withdrawal-dependency');

    Route::get('/read-session-submission', 'SessionSubmissionController@readSessionSubmission')
        ->middleware('permission:session-submission-create')
        ->name('read-session-submission-information');

    /* post routes */
    Route::post('/get-session-details', 'SessionSubmissionController@getSessionDetails')
        ->middleware('permission:session-submission-create')
        ->name('get-session-information');

    Route::post('/create-session-submission', 'SessionSubmissionController@create')
        ->middleware('permission:session-submission-create')
        ->name('create-session-submission');

    Route::post('/withdraw-session-report', 'SessionSubmissionController@withdraw')
        ->middleware('permission:session-submission-withdraw')
        ->name('withdraw-session-report');

    Route::delete('/delete-session-submission', 'SessionSubmissionController@delete')
        ->middleware('permission:session-submission-delete')
        ->name('delete-session-submission');

    Route::post('/preview-resubmit-session', 'SessionSubmissionController@resubmitPreview')
        ->middleware('permission:session-submission-create')
        ->name('get-preview-session-for-resubmit');

    Route::post('/resubmit-session', 'SessionSubmissionController@resubmit')
        ->middleware('permission:session-submission-create')
        ->name('resubmit-child-session');
});
