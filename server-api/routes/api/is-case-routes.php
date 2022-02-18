<?php


Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    // IS Case Routes
    Route::get('/is-case-list', 'ISCaseController@listISCases')->name('is-case-list');

    // IS Case Claim Routes
    Route::get('/is-case-claim-list', 'ISCaseController@listISCasesClaims')->name('is-case-claim-list');
    Route::post('/add-is-case-claim-dependency', 'ISCaseController@addIsClaimDependency')->name('add-is-case-claim-dependency');
    Route::post('/add-is-case-claim', 'ISCaseController@createISCaseClaim')->name('add-is-case-claim');
    Route::post('/cancel-is-case-claim', 'ISCaseController@cancelISCaseClaim')->name('cancel-is-case-claim');

    // IS Case Claim Submission Routes
    Route::get('/is-case-claim-submissions-list', 'ISCaseController@listFailedSubmissions')->name('is-case-claim-submissions-list');
    Route::post('/is-case-claim-submissions-delete', 'ISCaseController@deleteCaseClaimSubmission')->name('is-case-claim-submissions-delete');

});
