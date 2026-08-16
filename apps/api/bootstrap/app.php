<?php
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Symfony\Component\Routing\Exception\RouteNotFoundException;
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        // This app has no web/login routes at all and is bearer-token only (no SPA cookie
        // session flow exists). Never redirect an unauthenticated request to a 'login' route.
        $middleware->redirectGuestsTo(fn () => null);
        // Not auto-registered by the Laravel 12 skeleton; routes/api.php uses ->middleware('ability:...').
        $middleware->alias(['abilities' => CheckAbilities::class, 'ability' => CheckForAnyAbility::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // This app has no web/login routes at all. Laravel's default unauthenticated() handler falls
        // back to redirect()->guest(route('login')) for requests that don't send Accept: application/json,
        // which 500s here since no 'login' route exists. Always answer 401 JSON instead.
        $exceptions->render(fn (AuthenticationException $e) => response()->json(['message' => 'Unauthenticated.'], 401));
        // Defensive fallback: redirectGuestsTo() above should prevent this entirely, but if any code
        // path still tries to resolve the nonexistent 'login' route, answer 401 JSON rather than 500.
        $exceptions->render(function (RouteNotFoundException $e) {
            if (str_contains($e->getMessage(), '[login]')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return null;
        });
    })
    ->create();
