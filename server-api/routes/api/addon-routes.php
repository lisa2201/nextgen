<?php

use Kinderm8\Addon2;

    // get addon List
    Route::get('/addons', 'AddonController@index');

    // get addon Info
    Route::get('/addonInfo', 'AddonController@show');


    