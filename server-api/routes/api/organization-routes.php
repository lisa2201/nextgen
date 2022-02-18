<?php

// custom plan registration
Route::post('create_cust_plan', 'OrganizationController@create_cust_plan');

// custom plan verify email
Route::post('/cust_plan_verify_email', 'OrganizationController@verifySubscriptionEmail')->name('client-subscription-email-verify');

// custom plan resend verification email
Route::post('/resend_cust_plan_verify_email', 'OrganizationController@resendVerifyEmail')->name('resent-client-subscription-email-verify');

// quotation accept email
Route::post('/quotation_verify_email', 'OrganizationController@verifyQuotationEmail');

// resend quotation accept email
Route::post('/resend-quotation', 'OrganizationController@resendQuotationEmail');

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function ()
{
    /* get routes */
    Route::get('/get-org', 'OrganizationController@getOrg')
        ->name('get-organization');

    Route::get('/get-org-list', 'OrganizationController@get')
        ->middleware('permission:organization-access')
        ->name('get-organizations');

    Route::get('/get-org-branches', 'OrganizationController@getBranches')
        ->middleware('permission:branch-access')
        ->name('get-organization-branches');

    Route::get('/dataset-orgs', 'OrganizationController@dataTable')
        ->middleware('permission:organization-list')
        ->name('get-datatable-organizations');

    Route::get('/edit-org', 'OrganizationController@edit')
        ->middleware('permission:organization-create')
        ->name('edit-organization');

    Route::get('/org-email-check', 'OrganizationController@checkEmail')
        ->middleware('permission:organization-create')
        ->name('check-org-email');

    Route::get('/org-info', 'OrganizationController@getInfo')
        ->middleware('permission:organization-access')
        ->name('org-edit-view'); // edit tab

    Route::get('/quote-info', 'OrganizationController@getQuoteInfo')
        ->middleware('permission:organization-access')
        ->name('org-quote-info'); // get quotation info

    Route::get('/get-org-branch-access', 'OrganizationController@getUserBranchLinks')
        ->middleware('permission:organization-access')
        ->name('get-org-branch-access-info');

    /* post routes */
    Route::post('/create-org', 'OrganizationController@create')
        ->middleware('permission:organization-create')
        ->name('create-organization');

    Route::post('/create_subscriber', 'OrganizationController@create_subscriber')
        ->middleware('permission:organization-create')
        ->name('create-organization'); //for create new subscriber

    Route::post('/update-org', 'OrganizationController@update_subscriber')
        ->middleware('permission:organization-edit')
        ->name('update-organization');

    Route::delete('/delete-org', 'OrganizationController@delete')
        ->middleware('permission:organization-delete')
        ->name('delete-organization'); // for delete subscriber

    Route::post('/delete-org-multi', 'OrganizationController@deleteMultiple')
        ->middleware('permission:organization-delete')
        ->name('delete-multi-organization'); // for delete multiple subscribers

    Route::post('/edit_quotation', 'OrganizationController@edit_quotation')
        ->middleware('permission:organization-create')
        ->name('create-organization'); //for edit the quotation

    Route::post('/approve-email', 'OrganizationController@approve')
        ->middleware('permission:subscription-approve')
        ->name('approve-organization'); // approve fixed plan

    Route::post('/approve-custom-email', 'OrganizationController@approveCustom')
        ->middleware('permission:subscription-approve')
        ->name('approve-custom-organization'); // approve custom plan

    Route::post('/update-org-branch-access', 'OrganizationController@linkSubscriberBranchAccess')
        ->middleware('permission:organization-edit')
        ->name('update-organization-branch-access');

    Route::post('/update-business-info','CenterSettingsController@storeBusinessInfo')
        ->middleware('permission:center-settings');

    Route::post('/update-business-logo','CenterSettingsController@storeBusinessLogo')
        ->middleware('permission:center-settings');
});
