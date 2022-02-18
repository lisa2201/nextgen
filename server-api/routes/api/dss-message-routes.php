<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
    Route::get('/get-dss-message-list', 'DSSMessageController@get')
        ->name('query-message-access');


    Route::get('/get-innovative-cases-list', 'DSSMessageController@getInnovativeSolutionCases')
        ->name('get-innovative-cases-list');


        Route::get('/get-innovative-cases-claims-list', 'DSSMessageController@getInnovativeSolutionCasesClaims')
        ->name('get-innovative-cases-list-claims');


});
