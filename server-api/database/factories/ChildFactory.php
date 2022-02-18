<?php

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use Kinderm8\Child;
use Faker\Generator as Faker;

$factory->define(Child::class, function (Faker $faker) {
    return [
        'id' => $faker->numberBetween(),
        'first_name' => $faker->name,
        'last_name' => $faker->name,
        'middle_name' => $faker->name,
        //'image' => $faker->imageUrl(120, 120),
        'gender' => $faker->boolean,
        'status' => $faker->boolean,
        'created_at' => $faker->date(),
        'attendance' => []
    ];
});
