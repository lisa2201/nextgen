<?php

class FileHelper
{
    /**
     * Name can also begin with a component name, eg: MyComponent::filename.
     * @param string $fileName Specifies a path to validate
     * @return boolean Returns true if the file name is valid. Otherwise returns false.
     */
    public static function validateName($fileName)
    {
        return preg_match('/^[a-z0-9\_\-\.\/]+$/i', $fileName) ? true : false;
    }

    /**
     * Validates whether a file has an allowed extension.
     * @param string $fileName Specifies a path to validate
     * @param array $allowedExtensions A list of allowed file extensions
     * @param boolean $allowEmpty Determines whether the file extension could be empty.
     * @return boolean Returns true if the file extension is valid. Otherwise returns false.
     */
    public static function validateExtension($fileName, $allowedExtensions, $allowEmpty = true)
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (!strlen($extension)) {
            return $allowEmpty;
        }
        return in_array($extension, $allowedExtensions);
    }

    /**
     * Sanitizes a string, replacing whitespace and a few other characters with dashes.
     *
     * Limits the output to alphanumeric characters, underscore (_) and dash (-).
     * Whitespace becomes a dash.
     *
     * @param string $string The string to be sanitized.
     * @return string The sanitized string.
     */
    public static function sanitizeText($string)
    {
        if (empty($string)) {
            throw new \InvalidArgumentException('No input string is given');
        }
        $string = strip_tags($string);
        // Preserve escaped octets.
        $string = preg_replace('|%([a-fA-F0-9][a-fA-F0-9])|', '---$1---', $string);
        // Remove percent signs that are not part of an octet.
        $string = str_replace('%', '', $string);
        // Restore octets.
        $string = preg_replace('|---([a-fA-F0-9][a-fA-F0-9])---|', '%$1', $string);
        if (function_exists('mb_strtolower')) {
            $string = mb_strtolower($string, 'UTF-8');
        } else {
            $string = strtolower($string);
        }
        $string = preg_replace('/\p{Mn}/u', '', Normalizer::normalize($string, Normalizer::FORM_KD));
        $string = preg_replace('/[^%a-z0-9 _-]/', '', $string);
        $string = preg_replace('/\s+/', '-', $string);
        $string = preg_replace('|-+|', '-', $string);
        $string = trim($string, '-');
        return $string;
    }

    /**
     * Human readable file size
     * @param $bytes
     * @return string
     */
    public static function bytesToHuman($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }
}
