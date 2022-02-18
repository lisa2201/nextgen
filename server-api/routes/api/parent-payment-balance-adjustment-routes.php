<?php

Route::group(['prefix' => 'portal', 'middleware' => ['auth.user']], function () {

    /* get routes */

    // get list of balance adjustments
    Route::get('/balance-adjustments', 'ParentPaymentBalanceAdjustmentsController@list');

    // get list of parents
    Route::get('/balance-adjustments-parent-list', 'ParentPaymentBalanceAdjustmentsController@listOfParents');


    /* post routes */
    
    // create balance adjustment
    Route::post('/add-balance-adjustment', 'ParentPaymentBalanceAdjustmentsController@createAdjustment');
});
