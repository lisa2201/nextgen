<?php

namespace Kinderm8\Validators;

use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class ReCaptcha
{
    public function validate($attribute, $value, $parameters, $validator)
    {
        try
        {
            $client = new Client();

            $options = [
                'form_params' => [
                    'secret' => config('subscripton.google_recaptcha_secret'),
                    'response' => $value
                ]
            ];

            $response = $client->post('https://www.google.com/recaptcha/api/siteverify', $options);

            $body = json_decode((string) $response->getBody());

            return $body->success;
        }
        catch(Exception $e)
        {
            return false;
        }

    }
}