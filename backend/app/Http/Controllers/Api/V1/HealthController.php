<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reports whether the API is up and can reach the database.
 * Used by the frontend setup check and by hosting health checks.
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $database = 'connected';
        } catch (Throwable) {
            $database = 'unreachable';
        }

        return response()->json([
            'data' => [
                'status' => $database === 'connected' ? 'ok' : 'degraded',
                'database' => $database,
                'time_utc' => now('UTC')->toIso8601String(),
            ],
        ], $database === 'connected' ? 200 : 503);
    }
}
