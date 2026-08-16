<?php

return [

    // Laravel 12's skeleton ships no config/hashing.php at all, which silently
    // defaults Hash::make() to bcrypt. AuthController relies on Hash::make()
    // producing Argon2id for the legacy-password-upgrade path, so this file
    // must exist and pin the driver explicitly.
    'driver' => env('HASH_DRIVER', 'argon2id'),

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => true,
    ],

    'argon' => [
        'memory' => 65536,
        'threads' => 1,
        'time' => 4,
        'verify' => true,
    ],

];
