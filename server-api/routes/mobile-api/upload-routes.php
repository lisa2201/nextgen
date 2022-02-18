<?php

// get presigned url (no-auth)
Route::get('/device-s3-signed-url', 'CommonController@getPreSignedUrl')->name('device-s3-signed-url');

