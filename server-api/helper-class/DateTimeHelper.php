<?php

use Carbon\Carbon;
use DateTime as PhpDateTime;

class DateTimeHelper
{
    const DEFAULT_TIMEZONE = "UTC";

    const DEFAULT_TIME_FORMAT = "h:i:s A";

    const DAYS_IN_WEEK = [
        [
            'index' => 0,
            'name' => 'sunday',
            'is_weekend' => true
        ],
        [
            'index' => 1,
            'name' => 'monday',
            'is_weekend' => false
        ],
        [
            'index' => 2,
            'name' => 'tuesday',
            'is_weekend' => false
        ],
        [
            'index' => 3,
            'name' => 'wednesday',
            'is_weekend' => false
        ],
        [
            'index' => 4,
            'name' => 'thursday',
            'is_weekend' => false
        ],
        [
            'index' => 5,
            'name' => 'friday',
            'is_weekend' => false
        ],
        [
            'index' => 6,
            'name' => 'saturday',
            'is_weekend' => true
        ]
    ];

    const DAYS_IN_WEEK_ISO = [
        1 => 'monday',
        2 => 'tuesday',
        3 => 'wednesday',
        4 => 'thursday',
        5 => 'friday',
        6 => 'saturday',
        7 => 'sunday'
    ];

    const DAYS_IN_SHORT = [
        'm' => 'monday',
        't' => 'tuesday',
        'w' => 'wednesday',
        'th' => 'thursday',
        'f' => 'friday',
        'sa' => 'saturday',
        'su' => 'sunday'
    ];

    /**
     * current datetime
     * @return {timestamp} Carbon|DateTimeHelper
     */
    public static function getDatetimeNow()
    {
        return Carbon::now();
    }

    /**
     * @param $date
     * @param string $format
     * @return string
     */
    public static function convertDateToDBFormat($date, $format = 'Y-m-d')
    {
        $dbFormat = 'Y-m-d';
        if (is_string($date)) {
            return strtolower(Carbon::createFromFormat($format, $date)->format($dbFormat));
        } else {
            return strtolower(Carbon::parse($date)->format($dbFormat));
        }
    }

    /**
     * Returns a human readable time difference from the value to the
     * current time. Eg: **10 minutes ago**
     *
     * @return string
     */
    public static function timeSince($datetime)
    {
        return self::makeCarbon($datetime)->diffForHumans();
    }

    /**
     * Returns 24-hour time and the day using the grammatical tense
     * of the current time. Eg: Today at 12:49, Yesterday at 4:00
     * or 18 Sep 2015 at 14:33.
     *
     * @return string
     */
    public static function timeTense($datetime)
    {
        $datetime = self::makeCarbon($datetime);
        $yesterday = $datetime->subDays(1);
        $tomorrow = $datetime->addDays(1);
        $time = $datetime->format('H:i');
        $date = $datetime->format('j M Y');
        if ($datetime->isToday()) {
            $date = 'Today';
        }
        elseif ($datetime->isYesterday()) {
            $date = 'Yesterday';
        }
        elseif ($datetime->isTomorrow()) {
            $date = 'Tomorrow';
        }
        return $date.' at '.$time;
    }

    /**
     * Converts mixed inputs to a Carbon object.
     *
     * @return Carbon|Carbon
     */
    public static function makeCarbon($value, $throwException = true)
    {
        if ($value instanceof Carbon) {
            // Do nothing
        }
        elseif ($value instanceof PhpDateTime) {
            $value = Carbon::instance($value);
        }
        elseif (is_numeric($value)) {
            $value = Carbon::createFromTimestamp($value);
        }
        elseif (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value)) {
            $value = Carbon::createFromFormat('Y-m-d', $value)->startOfDay();
        }
        else {
            try {
                $value = Carbon::parse($value);
            } catch (Exception $ex) {

            }
        }

        if (!$value instanceof Carbon && $throwException) {
            throw new InvalidArgumentException('Invalid date value supplied to DateTime helper.');
        }

        return $value;
    }

    /**
     * Converts a PHP date format to "Moment.js" format.
     * @param string $format
     * @return string
     */
    public static function momentFormat($format)
    {
        $replacements = [
            'd' => 'DD',
            'D' => 'ddd',
            'j' => 'D',
            'l' => 'dddd',
            'N' => 'E',
            'S' => 'o',
            'w' => 'e',
            'z' => 'DDD',
            'W' => 'W',
            'F' => 'MMMM',
            'm' => 'MM',
            'M' => 'MMM',
            'n' => 'M',
            't' => '', // no equivalent
            'L' => '', // no equivalent
            'o' => 'YYYY',
            'Y' => 'YYYY',
            'y' => 'YY',
            'a' => 'a',
            'A' => 'A',
            'B' => '', // no equivalent
            'g' => 'h',
            'G' => 'H',
            'h' => 'hh',
            'H' => 'HH',
            'i' => 'mm',
            's' => 'ss',
            'u' => 'SSS',
            'e' => 'zz', // deprecated since version 1.6.0 of moment.js
            'I' => '', // no equivalent
            'O' => '', // no equivalent
            'P' => '', // no equivalent
            'T' => '', // no equivalent
            'Z' => '', // no equivalent
            'c' => '', // no equivalent
            'r' => '', // no equivalent
            'U' => 'X',
        ];

        foreach ($replacements as $from => $to) {
            $replacements['\\'.$from] = '['.$from.']';
        }

        $momentFormat = strtr($format, $replacements);

        return $momentFormat;
    }

    public static function formatMinToTimeArray($time)
    {
        $hours = (int) floor($time / 60);
        $minutes = $time % 60;

        return [
            'hour' => $hours,
            'min' => $minutes
        ];
    }

    public static function formatTimeArrayToMin($time, $format)
    {
        $hours = (int) floor($time / 60);
        $minutes = $time % 60;

        $dt = Carbon::now();
        $dt->hour((int) $hours)->minute((int) $minutes)->second(0);

        return $dt->format($format);
    }

    /*-------------- TimeZone | Default : UTC ----------- */

    public static function getTimezoneDatetime($date, $timezone = null)
    {
        try
        {
            if (!($date instanceof Carbon))
            {
                if (is_numeric($date))
                { // Timestamp
                    $date = Carbon::createFromTimestamp($date);
                }
                else
                {
                    $date = Carbon::parse($date);
                }
            }

            return $date->setTimezone(($timezone != null) ? $timezone : self::DEFAULT_TIMEZONE);
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            return null;
        }
    }

    public static function getDateFormat($value, $format = null)
    {
        $date = '';

        try
        {
            if (!Helpers::IsNullOrEmpty($value) && auth()->check())
            {
                $date = DateTimeHelper::getTimezoneDatetime($value, auth()->user()->timezone)->toDateString();
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }

        return $date;
    }

    /*------------------------- */

    public static function dateTimeFormat($value, $isDate = true)
    {
        $return = [];

        try
        {
            if($value != null && $value != '')
            {
                $return['formatedValue'] = DateTimeHelper::getTimezoneDatetime($value, auth()->user()->timezone)->toDateString();
                $return['value'][($isDate) ? 'date' : 'time'] = [$value];
            }
            else
            {
                $return['formatedValue'] = '';
                $return['value'][($isDate) ? 'date' : 'time'] = [];
            }
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);

            $return = [];
        }

        return $return;
    }

    /**
     * get week days info
     * @param $list
     * @return array
     */
    public static function getDaysInWeek($list)
    {
        $newlist = [];

        foreach ($list as $day)
        {
            array_push($newlist, array_values(array_filter(self::DAYS_IN_WEEK, function($item) use ($day)
            {
                return (int) $item['index'] === (int) $day;
            }))[0]);
        }

        return $newlist;
    }

    public static function convertTimeStringToMins($value)
    {
        $parts = explode(":", $value);

        $hours = intval($parts[0]);
        $minutes = intval($parts[1]);

        return $hours * 60 + $minutes;
    }

    public static function cleanDateFormat($value)
    {
        return str_replace(['/', '|', ':'], '-', $value);
    }

    public static function mapWeekDays(array $array)
    {
        $list = [];

        try
        {
            if (!empty(array_filter($array, function ($i) { return strlen($i) > 2; })))
            {
                $list = array_map('strtolower', $array);
            }
            else
            {
                foreach ($array as $day)
                {
                    $results = array_filter(self::DAYS_IN_SHORT, function($value, $key) use ($day)
                    {
                        return $key === strtolower($day);
                    }, ARRAY_FILTER_USE_BOTH);

                    array_push($list, array_values ($results)[0]);
                }
            }
        }
        catch(Exception $e)
        {
            ErrorHandler::log($e);
        }

        return $list;
    }

    public static function BookingTime($datetime)
    {
        $datetime = self::makeCarbon($datetime);

        $time = $datetime->format('g:i a');
        $date = $datetime->format('j M Y');

        return $date.' at '.$time;
    }
}
