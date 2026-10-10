<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

/*
| All endpoints are versioned under /api/v1.
*/
Route::prefix('v1')->group(function () {
    // Sessions live in MySQL, so the health check must not start one:
    // otherwise a database outage surfaces as a 500 instead of a 503.
    Route::get('/health', HealthController::class)
        ->withoutMiddleware(EnsureFrontendRequestsAreStateful::class);

    Route::prefix('auth')->group(function () {
        Route::middleware('throttle:6,1')->group(function () {
            Route::post('/register', [AuthController::class, 'register']);
            Route::post('/login', [AuthController::class, 'login']);
        });

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/user', [AuthController::class, 'user']);
        });
    });
});
