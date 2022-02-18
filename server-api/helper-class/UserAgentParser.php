<?php

use UAParser\Exception\FileNotFoundException;
use UAParser\Parser;

class UserAgentParser
{
    public $parser;
    public $userAgent;
    public $operatingSystem;
    public $device;
    public $originalUserAgent;

    /**
     * UserAgentParser constructor.
     * @param null $userAgent
     * @throws FileNotFoundException
     */
    public function __construct($userAgent = null)
    {
        if (!$userAgent && isset($_SERVER['HTTP_USER_AGENT'])) {
            $userAgent = $_SERVER['HTTP_USER_AGENT'];
        }
        $this->parser = Parser::create()->parse($userAgent);
        $this->userAgent = $this->parser->ua;
        $this->operatingSystem = $this->parser->os;
        $this->device = $this->parser->device;
        $this->originalUserAgent = $this->parser->originalUserAgent;
    }

    public function detectUserAgent()
    {
        return [
            'user_agent' => $this->userAgent,
            'operating_system' => $this->operatingSystem,
            'device' => $this->device,
            'user_agent_raw' => $this->originalUserAgent
        ];
    }

    public function getOperatingSystemVersion()
    {
        return $this->operatingSystem->major .
            ($this->operatingSystem->minor !== null ? '.' . $this->operatingSystem->minor : '') .
            ($this->operatingSystem->patch !== null ? '.' . $this->operatingSystem->patch : '');
    }

    public function getUserAgentVersion()
    {
        return $this->userAgent->major .
            ($this->userAgent->minor !== null ? '.' . $this->userAgent->minor : '') .
            ($this->userAgent->patch !== null ? '.' . $this->userAgent->patch : '');
    }
}
