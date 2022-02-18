<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/domain-exists', 'BranchController@domainExists')
        ->middleware('permission:branch-access')
        ->name('domain-exists');

    Route::get('/get-branch-list', 'BranchController@get')
        ->middleware('permission:branch-access')
        ->name('get-branches');

    Route::get('/get-dashboard-branch-list', 'BranchController@DashboardList')
        ->middleware('permission:branch-access')
        ->name('dashboard-branch-list');

    Route::get('/get-branch-info', 'BranchController@edit')
        ->middleware('permission:branch-access')
        ->name('get-branch-details');

    Route::get('/get-branch-list-by-user', 'BranchController@getBranchesByAuthUser')
        ->middleware('permission:branch-access')
        ->name('get-branches-user');

    Route::get('/get-org-ccs-info', 'BranchController@orgCCSInfo')
        ->middleware('permission:branch-access')
        ->name('get-org-ccs-info');

    /* post routes */
    Route::post('/create-branch', 'BranchController@create')
        ->middleware('permission:branch-create')
        ->name('create-branch');

    Route::post('/update-branch-status', 'BranchController@updateStatus')
        ->middleware('permission:branch-edit')
        ->name('update-branch-status');

    Route::post('/update-branch', 'BranchController@update')
        ->middleware('permission:branch-edit')
        ->name('update-branch');

    Route::delete('/delete-branch', 'BranchController@delete')
        ->middleware('permission:branch-delete')
        ->name('delete-branch');

    Route::get('/get-pincode', 'BranchController@getPincode')
        ->middleware('permission:branch-access')
        ->name('get-pincode');

    Route::post('/update-pincode', 'BranchController@updatePincode')
        ->middleware('permission:branch-edit')
        ->name('update-pincode');

});
