<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {
    /* get routes */
   /* Route::get('/get-determination', 'ACCSDeterminationController@get')
        ->middleware('permission:child-access')
        ->name('get-determination');*/
    Route::post('/new-determination', 'ACCSDeterminationController@newDetermination')
        ->middleware('permission:child-access')
        ->name('new-determination');
    Route::post('/update-determination', 'ACCSDeterminationController@updateDetermination')
        ->middleware('permission:child-access')
        ->name('update-determination');

    Route::get('get-determination', 'ACCSCertificateController@get')
        ->middleware('permission:child-access')
        ->name('get-determination');
    Route::post('/new-certificate', 'ACCSCertificateController@newCertificate')
        ->middleware('permission:child-access')
        ->name('new-certificate');
    Route::post('/update-certificate-state-territory', 'ACCSCertificateController@updateStateTerritory')
        ->middleware('permission:child-access')
        ->name('update-certificate');

    Route::post('/update-certificate', 'ACCSCertificateController@updateCertificate')
        ->middleware('permission:child-access')
        ->name('update-certificate');
    Route::post('advice-child-no-longer-at-risk', 'ACCSCertificateController@adviceChildNoLongerAtRisk')
        ->middleware('permission:child-access')
        ->name('update-certificate');
    Route::post('delete-certificate','ACCSCertificateController@deleteCertificate')
        ->middleware('permission:child-access')
        ->name('delete-certificate');
    Route::post('cancel-certificate','ACCSCertificateController@cancelCertificate')
        ->middleware('permission:child-access')
        ->name('cancel-certificate');
    Route::post('update-certificate-documents', 'ACCSCertificateController@updateDocuments')
        ->middleware('permission:child-access')
        ->name('update-certificate-documents');
    Route::post('update-state-territory-document', 'ACCSCertificateController@updateStateTerritoryDocument')
        ->middleware('permission:child-access')
        ->name('update-certificate-documents');

    Route::get('get-certificate-by-id','ACCSCertificateController@getCertificateByID')
        ->middleware('permission:child-access')
        ->name('get-certificate-by-id');
    Route::get('get-determination-by-id','ACCSDeterminationController@getDeterminationByID')
        ->middleware('permission:child-access')
        ->name('get-certificate-by-id');
});
