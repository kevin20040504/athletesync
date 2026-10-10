<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Events\CalendarRequest;
use App\Models\Event;
use App\Services\Recurrence;
use Illuminate\Http\JsonResponse;

/**
 * Everything on the user's calendar in [from, to): one entry per
 * occurrence, with recurring events expanded. Sorted by start time.
 */
class CalendarController extends Controller
{
    public function __invoke(CalendarRequest $request, Recurrence $recurrence): JsonResponse
    {
        $from = $request->from();
        $to = $request->to();

        $occurrences = $request->user()->events()
            ->overlapping($from, $to)
            ->get()
            ->flatMap(fn (Event $event) => array_map(fn (array $occurrence) => [
                'event_id' => $event->id,
                'title' => $event->title,
                'category' => $event->category,
                'location' => $event->location,
                'all_day' => $event->all_day,
                'recurring' => $event->isRecurring(),
                'starts_at' => $occurrence['starts_at'],
                'ends_at' => $occurrence['ends_at'],
            ], $recurrence->occurrences($event, $from, $to)))
            ->sortBy(fn (array $occurrence) => $occurrence['starts_at'])
            ->map(fn (array $occurrence) => [
                ...$occurrence,
                'starts_at' => $occurrence['starts_at']->toIso8601ZuluString(),
                'ends_at' => $occurrence['ends_at']->toIso8601ZuluString(),
            ])
            ->values();

        return response()->json(['data' => $occurrences]);
    }
}
