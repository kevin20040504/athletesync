<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Events\CalendarRequest;
use App\Services\Calendar;
use App\Support\Occurrence;
use Illuminate\Http\JsonResponse;

/**
 * Everything on the user's calendar in [from, to): one entry per
 * occurrence, with recurring events expanded. Sorted by start time.
 */
class CalendarController extends Controller
{
    public function __invoke(CalendarRequest $request, Calendar $calendar): JsonResponse
    {
        $occurrences = $calendar->forUser($request->user(), $request->from(), $request->to());

        return response()->json([
            'data' => $occurrences->map(fn (Occurrence $occurrence) => $occurrence->toArray()),
        ]);
    }
}
