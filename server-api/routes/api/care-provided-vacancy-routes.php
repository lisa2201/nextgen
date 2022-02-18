<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-care-provided-vacancy', 'CareProvidedVacancyController@get')
        ->middleware('permission:care-provided-vacancy-access')
        ->name('care_provided_vacancy-get');

    /* post routes */
    Route::post('/create-care-provided-vacancy', 'CareProvidedVacancyController@save_request')
        ->middleware('permission:care-provided-vacancy-create')
        ->name('care_provided_vacancy-create');
});
