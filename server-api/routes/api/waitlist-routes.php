<?php

//waitlist
Route::post('/child-wait-list-store', 'WaitListController@storeWaitlist')->name('cild-waitlist-details');
Route::get('/testGet', 'WaitListController@testGet')->name('testGet');

//enquiry
Route::post('/child-enquiry-store', 'WaitListController@storeEnquiry')->name('child-enquiry-store');

//get-enrollment-data
Route::post('/enroll-child', 'WaitListController@enrollChild')->name('enroll-child');

//get-enrollment-master-data (save  enrolment for masrter )
Route::post('/enroll-child-master', 'WaitListController@enrollChildMaster')->name('enroll-child-master');

//get-enrollment-master-data
Route::post('/enrolment_format_creater_public', 'WaitListController@getEnrollmentDynamicDataPublic')->name('enrolment_format_creater_public');

//request - enrollment data
Route::post('/enroll_child_save_public', 'WaitListController@enrollChildSavePublic')->name('enroll_child_save_public');

Route::get('/get-enrolment-form-branches', 'WaitListController@getBranchList')->name('get-enrolment-form-branches');

Route::get('/get-enrolment-form-branches-for-org', 'WaitListController@getBranchListForSiteManager')->name('get-enrolment-form-branches-for-org');

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {


    /* get routes */
    Route::get('/get-waitlist', 'WaitListController@get')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('waitlist-view');

    Route::get('/send-enrollment-form', 'WaitListController@sendEnrollmentLink')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('send-enrollment-form');

    Route::get('/get-enrollment-info', 'WaitListController@getEnrollmentData')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('get-enrollment-data');

    //activate-child
    Route::get('/activate-child', 'WaitListController@createChild')
        ->middleware('permission:waitlist-child-create')
        ->name('activate-cild');

    Route::delete('/delete-item', 'WaitListController@delete')
        ->middleware('permission:waitlist-delete')
        ->name('delete-item');

    Route::get('/get-enroll-link', 'WaitListController@getlink')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('get-link');

    Route::get('/get-waitlist-dashboard-summary', 'WaitListController@getDashboardSummery')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('waitlist-dashboard-summery');

    //post routes
    Route::post('/child-wait-list-update', 'WaitListController@update')
        ->middleware('permission:waitlist-edit')
        ->name('waitlist-update');

    Route::post('/child-enquiry-update', 'WaitListController@enquiryUpdate')
        ->middleware('permission:waitlist-edit')
        ->name('child-enquiry-update');

    Route::post('/child-waitlist-enrolment-update', 'WaitListController@updateEnrolment')
        ->middleware('permission:waitlist-edit')
        ->name('waitlist-enrolment-update');


    //dynamic format get
    Route::post('/waitlist_format-creater', 'WaitListController@getEnrollmenWaitlisttDynamicData')
        ->middleware('permission:enrollment-master-access')
        ->name('waitlist_format-creater');

    //responce new input field in enrollment form
    Route::post('/new-input-save', 'WaitListController@storeNewInput')
        ->middleware('permission:enrollment-master-edit')
        ->name('new-input-save');

    Route::get('/send-waitlist-form', 'EnquiriesController@sendWaitlistLink')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('send-waitlist-form');

    Route::get('/get-org-info', 'WaitListController@getOrgInfo')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('get-org-info');

    Route::post('/add-section', 'WaitListController@addSection')
        ->middleware('permission:enrollment-master-edit')
        ->name('add-section');

    Route::post('/section-rename', 'WaitListController@editSectionName')
        ->middleware('permission:enrollment-master-edit')
        ->name('section-rename');

    Route::post('/remove-field', 'WaitListController@deleteInputField')
        ->middleware('permission:enrollment-master-edit')
        ->name('remove-field');

    Route::post('/section-remove', 'WaitListController@deleteSection')
        ->middleware('permission:enrollment-master-edit')
        ->name('section-remove');

    Route::post('/get-enrol-wait-note', 'WaitListController@getNote')
        ->middleware('permission:enrollment-master-access')
        ->name('get-enrol-wait-note');

    Route::post('/save-note', 'WaitListController@saveNote')
        ->middleware('permission:enrollment-master-access')
        ->name('save-note');

    Route::post('/delete-note', 'WaitListController@deleteNote')
        ->middleware('permission:enrollment-master-access')
        ->name('delete-note');

    Route::post('/crm-branch-change', 'WaitListController@crmBranchChange')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('crm-branch-change');

    Route::get('/get-settings-waitlist', 'WaitListController@waitlistSettings')
        ->middleware('permission:waitlist-enrollment-access')
        ->name('get-settings-waitlist');


});

Route::group(['prefix' => 'portal'], function () {
    /* get routes */

    Route::get('/get-enrollment-info', 'WaitListController@getEnrollmentData')->name('get-enrollment-data');

    // Route::get('/get-branch-dynamic-fields', 'WaitListController@geDynamicFields')->name('get-Dynamic-Fields');

});
