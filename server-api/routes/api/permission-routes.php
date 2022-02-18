<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-list-perms', 'PermissionsController@get')
        ->middleware('permission:permission-access')
        ->name('get-permissions');

    Route::get('/get-group-perms', 'PermissionsController@getGroup')
        ->middleware('permission:permission-access')
        ->name('get-permissions-group');

    Route::get('/permission-data', 'PermissionsController@getDependency')
        ->middleware('permission:permission-access')
        ->name('get-permission-dependency');

    Route::get('/get-type-permissions', 'PermissionsController@getPermissionByRoleType')
        ->middleware('permission:permission-access')
        ->name('get-permissions-by-role-type');

    Route::get('/get-user-permissions', 'PermissionsController@getUserPermissions')
        ->middleware('permission:role-access')
        ->name('get-user-permissions');

    /* post routes */
    Route::post('/update-permission-groups', 'PermissionsController@updatePermissionGroups')
        ->middleware('permission:permission-access')
        ->name('update-permission-groups');

    Route::post('/resolve-permission-issues', 'PermissionsController@resolvePermissionConflicts')
        ->middleware('permission:permission-access')
        ->name('resolve-permission-group-issues');

    Route::post('/update-user-permissions', 'PermissionsController@updateUserPermissions')
        ->middleware('permission:role-edit')
        ->name('update-user-permission');
});

Route::group(['middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-user-perms', 'PermissionsController@getPermissionsByRole')
        ->name('get-permissions-by-role');
});
