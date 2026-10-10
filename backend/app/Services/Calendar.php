<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use App\Support\Occurrence;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Turns stored events into the occurrences that fall in a time range.
 */
class Calendar
{
    public function __construct(private Recurrence $recurrence) {}

    /**
     * The user's occurrences overlapping [$from, $to), sorted by start time.
     *
     * @param  int|null  $exceptEventId  Leave this event out (e.g. the one being edited).
     * @return Collection<int, Occurrence>
     */
    public function forUser(User $user, Carbon $from, Carbon $to, ?int $exceptEventId = null): Collection
    {
        $events = $user->events()
            ->overlapping($from, $to)
            ->when($exceptEventId, fn ($query) => $query->whereKeyNot($exceptEventId))
            ->get();

        return $this->expand($events, $from, $to);
    }

    /**
     * @param  iterable<Event>  $events
     * @return Collection<int, Occurrence>
     */
    public function expand(iterable $events, Carbon $from, Carbon $to): Collection
    {
        return collect($events)
            ->flatMap(fn (Event $event) => array_map(
                fn (array $occurrence) => new Occurrence($event, $occurrence['starts_at'], $occurrence['ends_at']),
                $this->recurrence->occurrences($event, $from, $to),
            ))
            ->sortBy([
                fn (Occurrence $a, Occurrence $b) => $a->startsAt <=> $b->startsAt,
                fn (Occurrence $a, Occurrence $b) => $a->event->id <=> $b->event->id,
            ])
            ->values();
    }
}
