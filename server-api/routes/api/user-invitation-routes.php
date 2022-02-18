<?php

// verify invitation
Route::get('/auth_verify_invitation', 'UserInvitationController@verifyInvitation')
    ->name('verify-client-invitation');

// verify invitation password setup
Route::get('/auth_verify_invitation_password_setup', 'UserInvitationController@verifyInvitationPasswordSetup')
    ->name('verify-client-invitation-password-setup');

Route::post('/auth_accept_invitation_password_setup', 'UserInvitationController@acceptInvitationPasswordSetup')
    ->name('accept-invitation-password-setup');

Route::post('/auth_accept_invitation', 'UserInvitationController@acceptInvitation')
    ->name('accept-client-invitation');

Route::get('/get_user_data', 'UserInvitationController@getUserData')
    ->name('get-user-data');

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-invitation-list', 'UserInvitationController@get')
        ->middleware('permission:invitation-access')
        ->name('get-invitation-list');

    Route::get('/invitation-email-exists', 'UserInvitationController@emailExistsInvitation')
        ->middleware('permission:invitation-access')
        ->name('invitations-email-exists');

    Route::get('/edit-invitation', 'UserInvitationController@edit')
        ->middleware('permission:invitation-edit')
        ->name('get-single-invitation');

    Route::get('/resend-invitation', 'UserInvitationController@resendInvitation')
        ->middleware('permission:invitation-create')
        ->name('resend-invitation');

    Route::get('/get-invitation-roles', 'UserInvitationController@getInvitationRoles')
        ->middleware('permission:invitation-access')
        ->name('get-invitation-roles');

    /* post routes */
    Route::post('/create-invitation', 'UserInvitationController@create')
        ->middleware('permission:invitation-create')
        ->name('create-invitation');

    Route::post('/update-invitation', 'UserInvitationController@update')
        ->middleware('permission:invitation-edit')
        ->name('update-invitation');

    Route::delete('/delete-invitation', 'UserInvitationController@delete')
        ->middleware('permission:invitation-delete')
        ->name('delete-invitation');

    Route::post('/send-bulk-invitation', 'UserInvitationController@sendBulkInvitationParent')
        ->middleware('permission:user-create|invitation-create')
        ->name('send-bulk-invitation');
});
