<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EventCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Events\CalendarRequest;
use App\Services\Calendar;
use App\Services\ConflictDetector;
use App\Support\Occurrence;
use Illuminate\Http\JsonResponse;

/**
 * GET /stats?from&to: dashboard numbers for a range (typically a week).
 */
class StatsController extends Controller
{
    public function __invoke(CalendarRequest $request, Calendar $calendar, ConflictDetector $detector): JsonResponse
    {
        $user = $request->user();
        $from = $request->from();
        $to = $request->to();

        $occurrences = $calendar->forUser($user, $from, $to);

        // Scheduled minutes per category, counting only the part inside the
        // range. All-day events are markers, not time spent.
        $minutes = array_fill_keys(array_map(fn (EventCategory $c) => $c->value, EventCategory::cases()), 0);
        $occurrences
            ->reject(fn (Occurrence $o) => $o->event->all_day)
            ->each(function (Occurrence $o) use (&$minutes, $from, $to) {
                $minutes[$o->event->category->value] += (int) $o->startsAt->max($from)->diffInMinutes($o->endsAt->min($to));
            });

        $tasks = $user->tasks();

        return response()->json([
            'data' => [
                'minutes_by_category' => $minutes,
                'conflicts' => $detector->within($occurrences)->count(),
                'tasks' => [
                    'open' => (clone $tasks)->open()->count(),
                    'overdue' => (clone $tasks)->open()->where('due_at', '<', now())->count(),
                    'due_in_range' => (clone $tasks)->open()->whereBetween('due_at', [$from, $to])->count(),
                    'completed_in_range' => (clone $tasks)->completed()->whereBetween('completed_at', [$from, $to])->count(),
                ],
            ],
        ]);
    }
}
