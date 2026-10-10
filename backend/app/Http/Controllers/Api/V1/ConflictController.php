<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Events\CalendarRequest;
use App\Http\Requests\Events\ConflictPreviewRequest;
use App\Models\Event;
use App\Services\Calendar;
use App\Services\ConflictDetector;
use App\Support\Conflict;
use Illuminate\Http\JsonResponse;

class ConflictController extends Controller
{
    /** How far ahead a recurring proposal is checked. */
    public const PREVIEW_DAYS = 180;

    public function __construct(
        private Calendar $calendar,
        private ConflictDetector $detector,
    ) {}

    /**
     * GET /conflicts?from&to: every pair of the user's occurrences that
     * overlap within the range, in time order.
     */
    public function index(CalendarRequest $request): JsonResponse
    {
        $occurrences = $this->calendar->forUser($request->user(), $request->from(), $request->to());

        // Both occurrences overlap the range, so their overlap does too.
        $conflicts = $this->detector->within($occurrences);

        return response()->json([
            'data' => $conflicts->map(fn (Conflict $c) => [
                'events' => [$c->first->toArray(), $c->second->toArray()],
                'overlap' => $c->overlapToArray(),
            ]),
        ]);
    }

    /**
     * POST /conflicts/preview: what a proposed event would clash with,
     * before it is saved. Recurring proposals are checked for
     * PREVIEW_DAYS from their first occurrence.
     */
    public function preview(ConflictPreviewRequest $request): JsonResponse
    {
        $proposed = new Event($request->eventAttributes());

        $from = $proposed->starts_at;
        $to = $proposed->isRecurring() ? $from->copy()->addDays(self::PREVIEW_DAYS) : $proposed->ends_at;

        $candidates = $this->calendar->expand([$proposed], $from, $to);
        $existing = $candidates->isEmpty()
            ? collect()
            : $this->calendar->forUser(
                $request->user(),
                $from,
                $candidates->max(fn ($o) => $o->endsAt),
                $request->ignoredEventId(),
            );

        $conflicts = $this->detector->between($candidates, $existing);

        return response()->json([
            'data' => $conflicts->map(fn (Conflict $c) => [
                'proposed' => [
                    'starts_at' => $c->first->startsAt->toIso8601ZuluString(),
                    'ends_at' => $c->first->endsAt->toIso8601ZuluString(),
                ],
                'conflicts_with' => $c->second->toArray(),
                'overlap' => $c->overlapToArray(),
            ]),
            'meta' => [
                'checked_from' => $from->toIso8601ZuluString(),
                'checked_to' => $to->toIso8601ZuluString(),
            ],
        ]);
    }
}
