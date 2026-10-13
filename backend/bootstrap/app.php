<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Sanctum SPA authentication: requests from SANCTUM_STATEFUL_DOMAINS
        // get session cookies + CSRF protection instead of bearer tokens.
        $middleware->statefulApi();

        // In production, requests arrive through Vercel's rewrite and Railway's
        // proxy. Trusting them makes request()->ip() the visitor's address, so
        // the login rate limit applies per visitor instead of to everyone at once.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Always answer API routes with JSON ({ "message": ..., "errors": ... }),
        // never with an HTML error page or a redirect to a login view.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
