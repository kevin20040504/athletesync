<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

/*
| All endpoints are versioned under /api/v1. Feature routes (auth, events,
| tasks, ...) are added here in Phase 3.
*/
Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);
});
