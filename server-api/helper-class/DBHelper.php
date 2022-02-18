<?php

use Illuminate\Database\Eloquent\Model;

class DBHelper
{
    const TABLE_SORT_VALUE_MAP = [
        'ascend' => 'ASC',
        'descend' => 'DESC'
    ];

    /**
     * Convert model to stdObject.
     *
     * @param array $fill
     * @return object (std) Object
     */
    public function toStd($fill = ['*'])
    {
        // backup visible
        $visible = $this->visible;

        if ($fill == ['*']) $fill = array_keys($this->getAttributes());

        // make sure we get all the fields we need
        $this->setVisible($fill);

        $std = (object) $this->attributesToArray();

        // restore visible
        $this->setVisible($visible);

        return $std;
    }

    /**
     * Make a model from stdObject.
     *
     * @param  stdClass $std
     * @param  array    $fill
     * @param  boolean  $exists
     * @return DBHelper|Model
     */
    public static function newFromStd(stdClass $std, $fill = ['*'], $exists = true)
    {
        $instance = new static;

        $values = ($fill == ['*'])
            ? (array) $std
            : array_intersect_key( (array) $std, array_flip($fill));

        // fill attributes and original arrays
        $instance->setRawAttributes($values, true);

        $instance->exists = $exists;

        return $instance;
    }

    /**
     * Alter an enum field constraints
     * @param $table
     * @param $field
     * @param array $options
     * @throws Throwable
     */
    public static function alterEnum($table, $field, array $options)
    {
        $check = "${table}_${field}_check";

        $enumList = [];

        foreach($options as $option)
        {
            $enumList[] = sprintf("'%s'::CHARACTER VARYING", $option);
        }

        $enumString = implode(", ", $enumList);

        DB::transaction(function () use ($table, $field, $check, $options, $enumString)
        {
            DB::statement(sprintf('ALTER TABLE %s DROP CONSTRAINT %s;', $table, $check));
            DB::statement(sprintf('ALTER TABLE %s ADD CONSTRAINT %s CHECK (%s::TEXT = ANY (ARRAY[%s]::TEXT[]))', $table, $check, $field, $enumString));
        });

    }

    /**
     * clean sql query string
     * @param $inp
     * @return array|mixed
     */
    public static function mysql_escape($inp)
    {
        if(is_array($inp)) return array_map(__METHOD__, $inp);

        if(!empty($inp) && is_string($inp))
        {
            return str_replace(
                ['\\', "\0", "\n", "\r", "'", '"', "\x1a"],
                ['\\\\', '\\0', '\\n', '\\r', "\\'", '\\"', '\\Z'],
                $inp);
        }

        return $inp;
    }

    /**
     * add sequence to table
     * @param string $table
     */
    public static function setSerialPrimaryKey(string $table)
    {
        try
        {
            DB::statement("ALTER TABLE " . $table . " ADD COLUMN id SERIAL PRIMARY KEY;");
        }
        catch (Exception $e)
        {
            ErrorHandler::log($e);
        }
    }

}
