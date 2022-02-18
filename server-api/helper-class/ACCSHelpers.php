<?php

use GuzzleHttp\Client;
use Kinderm8\Enums\AWSConfigType;

class ACCSHelpers
{

    public static function getCertificatesByChildEndpoint($providerID, $childCRN, $childDOB)
    {
        return Helpers::getConfig('certificate_by_child',AWSConfigType::API_GATEWAY).'?$ccsproviderid='.$providerID.'&$ccschildcrn='.$childCRN.'&$ccschilddateofbirth='.$childDOB.'&$expand=RiskReasons,SupportingDocuments';
    }

    public static function getDeterminationByChildEndpoint($providerID, $childCRN, $childDOB)
    {
        return Helpers::getConfig('determination_by_child',AWSConfigType::API_GATEWAY).'?$ccsproviderid='.$providerID.'&$ccschildcrn='.$childCRN.'&$ccschilddateofbirth='.$childDOB.'&$expand=RiskReasons,SupportingDocuments,ExtensionReasons';
    }

    public static function getCertificateByIDEndpoint($providerID, $certificateID, $serviceID)
    {
        return Helpers::getConfig('certificate_by_child',AWSConfigType::API_GATEWAY).'?$ccsproviderid='.$providerID.'&$ccscertificateid='.$certificateID.'&ccserviceid='.$serviceID.'&$expand=RiskReasons,SupportingDocuments';
    }

    public static function getDeterminationByIDEndpoint($providerID, $determinationID, $serviceID)
    {
        return Helpers::getConfig('determination_by_child', AWSConfigType::API_GATEWAY).'?$ccsproviderid='.$providerID.'&$ccscertificateid='.$determinationID.'&ccserviceid='.$serviceID.'&$expand=RiskReasons,SupportingDocuments,ExtensionReasons';
    }

    public static function getCertificatesByChild($provider_id, $child_crn, $child_dob, $person_id)
    {

        $url = self::getCertificatesByChildEndpoint($provider_id, $child_crn, $child_dob);

        $client = new Client();

        $res = $client->request('GET', $url, [
            'headers' => [
                'x-api-key' => config('aws.gateway_api_key'),
                'authpersonid' => $person_id,
            ]
        ]);

        $body = $res->getBody()->getContents();

        $resp_data_certificate = json_decode($body, true);

        return $resp_data_certificate;

    }

    public static function getCertificateByID($provider_id, $certificate_id, $service_id, $person_id)
    {

        $url = self::getCertificateByIDEndpoint($provider_id, $certificate_id, $service_id);

        $client = new Client();

        $res = $client->request('GET', $url, [
            'headers' => [
                'x-api-key' => config('aws.gateway_api_key'),
                'authpersonid' => $person_id,
            ]
        ]);

        $body = $res->getBody()->getContents();

        $resp_data_certificate = json_decode($body, true);

        return $resp_data_certificate;

    }

    public static function getDeterminationByChild($provider_id, $child_crn, $child_dob, $person_id)
    {

        $url = self::getDeterminationByChildEndpoint($provider_id, $child_crn, $child_dob);

        $client = new Client();

        $res = $client->request('GET', $url, [
            'headers' => [
                'x-api-key' => config('aws.gateway_api_key'),
                'authpersonid' => $person_id,
            ]
        ]);

        $body = $res->getBody()->getContents();

        $resp_data_determination = json_decode($body, true);

        return $resp_data_determination;

    }

    public static function getDeterminationByID($provider_id, $determination_id, $service_id, $person_id)
    {

        $url = self::getDeterminationByIDEndpoint($provider_id, $determination_id, $service_id);

        $client = new Client();

        $res = $client->request('GET', $url, [
            'headers' => [
                'x-api-key' => config('aws.gateway_api_key'),
                'authpersonid' => $person_id,
            ]
        ]);

        $body = $res->getBody()->getContents();

        $resp_data_determination = json_decode($body, true);

        return $resp_data_determination;

    }

}