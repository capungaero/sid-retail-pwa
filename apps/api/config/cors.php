<?php

// Published explicitly (framework default is allowed_origins ['*']) so production can be locked
// down to the HQ dashboard's origin via env instead of silently depending on a hidden default.
// Auth is a Sanctum bearer token carried by the SPA itself — no cookies — so
// supports_credentials stays false and '*' works when no origin list is configured.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
