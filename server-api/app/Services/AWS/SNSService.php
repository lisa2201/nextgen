<?php

namespace Kinderm8\Services\AWS;

use Aws\Sns\SnsClient;
use Exception;

class SNSService implements SNSContract
{
    private $client;

    public function __construct(SnsClient $client)
    {
        $this->client = $client;
    }

    /**
     * @param string $topic
     * @param array $data
     * @param string $subject
     * @return bool
     * @throws Exception
     */
    public function publishEvent(string $topic, array $data, string $subject)
    {
        try
        {
            // send sns message
            $this->client
                ->publish([
                    'TopicArn' => $topic,
                    'Message' => json_encode($data),
                    'Subject' => $subject
                ]);

            return true;
        }
        catch(Exception $e)
        {
            throw $e;
        }
    }
}
